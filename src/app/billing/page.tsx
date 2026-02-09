"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import Header from "@/components/Header";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
// TODO: Uncomment when stripe backend is implemented
// import { useQuery, useAction } from "convex/react";
// import { api } from "../../../convex/_generated/api";
// import { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanTier = "starter" | "professional" | "enterprise";

interface PlanInfo {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxProperties: number;
  maxUsers: number;
  features: string[];
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  pdfUrl: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANS: Record<PlanTier, PlanInfo> = {
  starter: {
    name: "Starter",
    monthlyPrice: 250,
    annualPrice: 2500,
    maxProperties: 10,
    maxUsers: 5,
    features: [
      "Up to 10 properties",
      "Up to 5 users",
      "Core features",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    monthlyPrice: 450,
    annualPrice: 4170,
    maxProperties: 25,
    maxUsers: 15,
    features: [
      "Up to 25 properties",
      "Up to 15 users",
      "Inspections & reports",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 600,
    annualPrice: 6000,
    maxProperties: 50,
    maxUsers: 50,
    features: [
      "Up to 50 properties",
      "Up to 50 users",
      "API access & Xero",
      "Dedicated support",
    ],
  },
};

// ---------------------------------------------------------------------------
// Mock data (replace with real queries when Stripe backend is ready)
// ---------------------------------------------------------------------------

const MOCK_CURRENT_PLAN: PlanTier = "professional";
const MOCK_BILLING_PERIOD: "monthly" | "annual" = "monthly";
const MOCK_RENEWAL_DATE = "2026-03-09";
const MOCK_SUBSCRIPTION_STATUS: "active" | "trialing" | "past_due" | "canceled" = "trialing";
const MOCK_TRIAL_ENDS = "2026-02-23";

const MOCK_USAGE = {
  properties: { used: 3, limit: 25 },
  users: { used: 2, limit: 15 },
};

const MOCK_INVOICES: Invoice[] = [
  { id: "INV-2026-001", date: "2026-02-09", amount: 0, status: "paid", pdfUrl: "#" },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-900/30 text-green-400 border-green-600/30",
    trialing: "bg-teal-900/30 text-teal-400 border-teal-600/30",
    past_due: "bg-yellow-900/30 text-yellow-400 border-yellow-600/30",
    canceled: "bg-red-900/30 text-red-400 border-red-600/30",
    paid: "bg-green-900/30 text-green-400 border-green-600/30",
    pending: "bg-yellow-900/30 text-yellow-400 border-yellow-600/30",
    failed: "bg-red-900/30 text-red-400 border-red-600/30",
  };

  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Free Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    paid: "Paid",
    pending: "Pending",
    failed: "Failed",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-700 text-gray-300 border-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className={`text-sm font-medium ${isNearLimit ? "text-yellow-400" : "text-gray-400"}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isNearLimit ? "bg-yellow-500" : "bg-teal-500"}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label}: ${used} of ${limit} used`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Billing Content
// ---------------------------------------------------------------------------

function BillingContent() {
  const { user } = useAuth();
  const { confirm: confirmDialog } = useConfirmDialog();

  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [isManagingPayment, setIsManagingPayment] = useState(false);

  // TODO: Replace with real Convex queries when stripe backend is ready
  // const subscription = useQuery(api.stripe.getSubscription, user ? { userId: user.id as Id<"users"> } : "skip");
  // const invoices = useQuery(api.stripe.getInvoices, user ? { userId: user.id as Id<"users"> } : "skip");
  // const createPortalSession = useAction(api.stripe.createBillingPortalSession);

  const currentPlan = PLANS[MOCK_CURRENT_PLAN];

  const daysUntilRenewal = useMemo(() => {
    const renewal = new Date(MOCK_RENEWAL_DATE);
    const today = new Date();
    const diff = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, []);

  const daysLeftInTrial = useMemo(() => {
    if (MOCK_SUBSCRIPTION_STATUS !== "trialing") return null;
    const trialEnd = new Date(MOCK_TRIAL_ENDS);
    const today = new Date();
    const diff = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, []);

  const handleManagePayment = async () => {
    setIsManagingPayment(true);
    try {
      // TODO: Replace with real Stripe portal session
      // const { url } = await createPortalSession({ userId: user!.id as Id<"users"> });
      // window.location.href = url;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Placeholder: In production, this redirects to Stripe Customer Portal
    } catch {
      // Error handling
    } finally {
      setIsManagingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = await confirmDialog({
      title: "Cancel Subscription",
      message: "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.",
      confirmLabel: "Cancel Subscription",
      cancelLabel: "Keep Subscription",
      variant: "danger",
    });

    if (confirmed) {
      // TODO: Call cancel subscription mutation
      // await cancelSubscription({ userId: user!.id as Id<"users"> });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Billing & Subscription</h1>

        {/* Trial banner */}
        {MOCK_SUBSCRIPTION_STATUS === "trialing" && daysLeftInTrial !== null && (
          <div className="bg-teal-900/20 border border-teal-600/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <ExclamationIcon />
            <div>
              <p className="text-sm font-medium text-teal-300">
                Free trial: {daysLeftInTrial} days remaining
              </p>
              <p className="text-xs text-teal-400/70 mt-0.5">
                Your trial ends on {new Date(MOCK_TRIAL_ENDS).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.
                Add a payment method to continue after your trial.
              </p>
            </div>
          </div>
        )}

        {/* Past due banner */}
        {MOCK_SUBSCRIPTION_STATUS === "past_due" && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <ExclamationIcon />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                Payment failed - please update your payment method
              </p>
              <p className="text-xs text-yellow-400/70 mt-0.5">
                Your subscription is past due. Update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ---- Current Plan Card ---- */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Current Plan</h2>
              <StatusBadge status={MOCK_SUBSCRIPTION_STATUS} />
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">{currentPlan.name}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-2xl font-bold text-teal-400">
                ${MOCK_BILLING_PERIOD === "annual" ? Math.round(currentPlan.annualPrice / 12) : currentPlan.monthlyPrice}
              </span>
              <span className="text-gray-400 text-sm">/month</span>
              {MOCK_BILLING_PERIOD === "annual" && (
                <span className="text-xs text-gray-400 ml-2">
                  (${currentPlan.annualPrice.toLocaleString()}/year)
                </span>
              )}
            </div>

            {/* Plan features */}
            <ul className="space-y-2 mb-6" aria-label="Plan features">
              {currentPlan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckIcon className="h-4 w-4 text-teal-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* Renewal info */}
            <div className="border-t border-gray-700 pt-4 mb-6">
              <p className="text-sm text-gray-400">
                {MOCK_SUBSCRIPTION_STATUS === "trialing"
                  ? `Trial ends ${new Date(MOCK_TRIAL_ENDS).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`
                  : `Next renewal: ${new Date(MOCK_RENEWAL_DATE).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} (${daysUntilRenewal} days)`
                }
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowPlanComparison(!showPlanComparison)}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
              >
                <ArrowUpIcon />
                Change Plan
              </button>
              <button
                type="button"
                onClick={handleManagePayment}
                disabled={isManagingPayment}
                className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
              >
                <CreditCardIcon className="h-4 w-4" />
                {isManagingPayment ? "Loading..." : "Manage Payment Method"}
              </button>
            </div>
          </div>

          {/* ---- Usage Stats ---- */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Usage</h2>
            <div className="space-y-6">
              <UsageBar
                label="Properties"
                used={MOCK_USAGE.properties.used}
                limit={MOCK_USAGE.properties.limit}
              />
              <UsageBar
                label="Users"
                used={MOCK_USAGE.users.used}
                limit={MOCK_USAGE.users.limit}
              />
            </div>

            <div className="border-t border-gray-700 mt-6 pt-4">
              <p className="text-xs text-gray-400">
                Need more? Upgrade your plan to increase limits.
              </p>
            </div>
          </div>
        </div>

        {/* ---- Plan Comparison (Collapsible) ---- */}
        {showPlanComparison && (
          <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Compare Plans</h2>
              <button
                type="button"
                onClick={() => setShowPlanComparison(false)}
                className="text-gray-400 hover:text-white text-sm transition-colors"
                aria-label="Close plan comparison"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.entries(PLANS) as [PlanTier, PlanInfo][]).map(([tier, plan]) => {
                const isCurrent = tier === MOCK_CURRENT_PLAN;
                return (
                  <div
                    key={tier}
                    className={`rounded-lg border p-5 ${
                      isCurrent
                        ? "border-teal-500 bg-teal-600/5"
                        : "border-gray-600 bg-gray-700/30"
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold text-white">${plan.monthlyPrice}</span>
                      <span className="text-sm text-gray-400">/mo</span>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-4 w-4 text-teal-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <span className="block text-center py-2 px-4 rounded-lg text-sm font-medium bg-gray-600 text-gray-300 cursor-default">
                        Current Plan
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="block w-full text-center py-2 px-4 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        onClick={() => {
                          // TODO: Implement plan change via Stripe
                          setShowPlanComparison(false);
                        }}
                      >
                        {PLANS[tier].monthlyPrice > currentPlan.monthlyPrice ? "Upgrade" : "Downgrade"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Plan changes take effect immediately. You will be prorated for the remainder of your billing period.
            </p>
          </div>
        )}

        {/* ---- Invoice History ---- */}
        <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Invoice History</h2>

          {MOCK_INVOICES.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" aria-label="Invoice history">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3 pr-4">Invoice</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3 pr-4">Date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3 pr-4">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3 pr-4">Status</th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INVOICES.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-700/50">
                      <td className="py-3 pr-4 text-sm text-white font-medium">{invoice.id}</td>
                      <td className="py-3 pr-4 text-sm text-gray-300">
                        {new Date(invoice.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-300">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={invoice.pdfUrl}
                          className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-sm transition-colors"
                          aria-label={`Download invoice ${invoice.id}`}
                        >
                          <DownloadIcon />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---- Cancel Subscription ---- */}
        <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Cancel Subscription</h2>
          <p className="text-sm text-gray-400 mb-4">
            If you cancel, you will retain access until the end of your current billing period.
            Your data will be preserved for 30 days after cancellation.
          </p>
          <button
            type="button"
            onClick={handleCancelSubscription}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-2 py-1"
          >
            Cancel subscription
          </button>
        </div>

        {/* ---- Help link ---- */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Need help with billing?{" "}
            <Link href="/settings" className="text-teal-400 hover:text-teal-300 underline transition-colors">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export (wrapped in RequireAuth, admin only)
// ---------------------------------------------------------------------------

export default function BillingPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <BillingContent />
    </RequireAuth>
  );
}
