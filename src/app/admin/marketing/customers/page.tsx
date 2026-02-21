"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCentsCurrency,
  formatDateAU,
  channelDisplayName,
  planDisplayName,
  calculateCAC,
  calculateLTVCACRatio,
} from "@/utils/marketingUtils";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelFilter = "" | "google_ads" | "linkedin_ads" | "meta_ads" | "organic" | "referral" | "direct" | "other";
type PlanFilter = "" | "trial" | "starter" | "professional" | "enterprise" | "churned";

interface Customer {
  _id: Id<"marketingCustomers">;
  organizationId?: Id<"organizations">;
  orgName: string | null;
  acquisitionChannel: string;
  acquisitionDate: string;
  acquisitionCost?: number;
  currentPlan: string;
  monthlyRevenue: number;
  lifetimeRevenue: number;
  notes?: string;
  createdAt: number;
}

interface ChannelBreakdown {
  channel: string;
  total: number;
  active: number;
  churned: number;
  avgCAC: number;
  avgLTV: number;
  ltvCacRatio: number;
  mrr: number;
  churnRate: number;
}

interface AcquisitionStats {
  totalCustomers: number;
  activeCustomers: number;
  overallCAC: number;
  avgLTV: number;
  overallLTVCAC: number;
  totalMRR: number;
  byChannel: ChannelBreakdown[];
}

interface OrgDropdownItem {
  _id: Id<"organizations">;
  name: string;
}

// ---------------------------------------------------------------------------
// Navigation tabs config
// ---------------------------------------------------------------------------

const NAV_TABS = [
  { label: "Overview", href: "/admin/marketing" },
  { label: "Data Entry", href: "/admin/marketing/entry" },
  { label: "Campaigns", href: "/admin/marketing/campaigns" },
  { label: "Customers", href: "/admin/marketing/customers" },
  { label: "Goals", href: "/admin/marketing/goals" },
] as const;

const CURRENT_TAB = "/admin/marketing/customers";

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const CHANNEL_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: "", label: "All Channels" },
  { value: "google_ads", label: "Google Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "organic", label: "Organic" },
  { value: "referral", label: "Referral" },
  { value: "direct", label: "Direct" },
  { value: "other", label: "Other" },
];

const PLAN_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: "", label: "All Plans" },
  { value: "trial", label: "Trial" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
  { value: "churned", label: "Churned" },
];

const CHANNEL_FORM_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "organic", label: "Organic" },
  { value: "referral", label: "Referral" },
  { value: "direct", label: "Direct" },
  { value: "other", label: "Other" },
];

const PLAN_FORM_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
  { value: "churned", label: "Churned" },
];

// ---------------------------------------------------------------------------
// Plan badge component
// ---------------------------------------------------------------------------

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    trial: "bg-blue-500/10 text-blue-400",
    starter: "bg-teal-500/10 text-teal-400",
    professional: "bg-purple-500/10 text-purple-400",
    enterprise: "bg-yellow-500/10 text-yellow-400",
    churned: "bg-red-500/10 text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[plan] ?? "bg-gray-500/10 text-gray-400"}`}
    >
      {planDisplayName(plan)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function CustomersPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <CustomersContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function CustomersContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Filters
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"marketingCustomers"> | null>(null);
  const [formOrgId, setFormOrgId] = useState("");
  const [formChannel, setFormChannel] = useState("direct");
  const [formAcqDate, setFormAcqDate] = useState("");
  const [formAcqCost, setFormAcqCost] = useState("");
  const [formPlan, setFormPlan] = useState("trial");
  const [formMRR, setFormMRR] = useState("");
  const [formLTV, setFormLTV] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Queries
  const customers = useQuery(
    api.marketingAnalytics.getCustomers,
    userId && isSuperAdmin
      ? {
          userId,
          ...(channelFilter ? { channel: channelFilter } : {}),
          ...(planFilter ? { plan: planFilter } : {}),
        }
      : "skip"
  ) as Customer[] | undefined;

  const acquisitionStats = useQuery(
    api.marketingAnalytics.getCustomerAcquisitionStats,
    userId && isSuperAdmin ? { userId } : "skip"
  ) as AcquisitionStats | undefined;

  const orgsDropdown = useQuery(
    api.marketingAnalytics.getOrganizationsForDropdown,
    userId && isSuperAdmin ? { userId } : "skip"
  ) as OrgDropdownItem[] | undefined;

  // Mutations
  const createCustomer = useMutation(api.marketingAnalytics.createCustomer);
  const updateCustomer = useMutation(api.marketingAnalytics.updateCustomer);
  const deleteCustomer = useMutation(api.marketingAnalytics.deleteCustomer);

  // Form helpers
  function resetForm() {
    setEditingId(null);
    setFormOrgId("");
    setFormChannel("direct");
    setFormAcqDate("");
    setFormAcqCost("");
    setFormPlan("trial");
    setFormMRR("");
    setFormLTV("");
    setFormNotes("");
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer._id);
    setFormOrgId(customer.organizationId ?? "");
    setFormChannel(customer.acquisitionChannel);
    setFormAcqDate(customer.acquisitionDate);
    setFormAcqCost(
      customer.acquisitionCost !== undefined
        ? String(customer.acquisitionCost / 100)
        : ""
    );
    setFormPlan(customer.currentPlan);
    setFormMRR(String(customer.monthlyRevenue / 100));
    setFormLTV(String(customer.lifetimeRevenue / 100));
    setFormNotes(customer.notes ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !formAcqDate) return;
    setSaving(true);
    try {
      const acquisitionCost = formAcqCost
        ? Math.round(parseFloat(formAcqCost) * 100)
        : undefined;
      const monthlyRevenue = Math.round(parseFloat(formMRR || "0") * 100);
      const lifetimeRevenue = Math.round(parseFloat(formLTV || "0") * 100);
      const organizationId = formOrgId
        ? (formOrgId as Id<"organizations">)
        : undefined;

      if (editingId) {
        await updateCustomer({
          userId,
          customerId: editingId,
          organizationId,
          acquisitionChannel: formChannel as "google_ads" | "linkedin_ads" | "meta_ads" | "organic" | "referral" | "direct" | "other",
          acquisitionDate: formAcqDate,
          acquisitionCost,
          currentPlan: formPlan as "trial" | "starter" | "professional" | "enterprise" | "churned",
          monthlyRevenue,
          lifetimeRevenue,
          notes: formNotes || undefined,
        });
      } else {
        await createCustomer({
          userId,
          organizationId,
          acquisitionChannel: formChannel as "google_ads" | "linkedin_ads" | "meta_ads" | "organic" | "referral" | "direct" | "other",
          acquisitionDate: formAcqDate,
          acquisitionCost,
          currentPlan: formPlan as "trial" | "starter" | "professional" | "enterprise" | "churned",
          monthlyRevenue,
          lifetimeRevenue,
          notes: formNotes || undefined,
        });
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Failed to save customer:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customerId: Id<"marketingCustomers">) {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to delete this customer record?"))
      return;
    try {
      await deleteCustomer({ userId, customerId });
    } catch (err) {
      console.error("Failed to delete customer:", err);
    }
  }

  // Access denied
  if (dbUser !== undefined && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Super-admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="admin" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/platform"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Platform
          </Link>
          <h1 className="text-2xl font-bold text-white">Customer Acquisition</h1>
          <p className="text-gray-400">
            Track customer acquisition and revenue attribution
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                tab.href === CURRENT_TAB
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-white">
              {acquisitionStats ? acquisitionStats.totalCustomers : "--"}
            </p>
            {acquisitionStats && (
              <p className="text-xs text-gray-400 mt-1">
                {acquisitionStats.activeCustomers} active
              </p>
            )}
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Avg CAC</p>
            <p className="text-2xl font-bold text-white">
              {acquisitionStats
                ? formatCentsCurrency(acquisitionStats.overallCAC)
                : "--"}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Avg LTV</p>
            <p className="text-2xl font-bold text-teal-400">
              {acquisitionStats
                ? formatCentsCurrency(acquisitionStats.avgLTV)
                : "--"}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">LTV:CAC Ratio</p>
            <p className="text-2xl font-bold text-white">
              {acquisitionStats
                ? `${acquisitionStats.overallLTVCAC}:1`
                : "--"}
            </p>
          </div>
        </div>

        {/* Filter Bar + Add Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Filter by channel"
          >
            {CHANNEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Filter by plan"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Customer
          </button>
        </div>

        {/* Customer Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          {!customers ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No customers found.</p>
              <button
                onClick={openCreate}
                className="text-sm text-teal-400 hover:text-teal-300 mt-2"
              >
                Add your first customer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-700/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Acq Date</th>
                    <th className="px-4 py-3">Current Plan</th>
                    <th className="px-4 py-3">MRR</th>
                    <th className="px-4 py-3">LTV</th>
                    <th className="px-4 py-3">Acq Cost</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {customers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {customer.orgName ?? "No linked org"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {channelDisplayName(customer.acquisitionChannel)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatDateAU(customer.acquisitionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={customer.currentPlan} />
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(customer.monthlyRevenue)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(customer.lifetimeRevenue)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {customer.acquisitionCost !== undefined
                          ? formatCentsCurrency(customer.acquisitionCost)
                          : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(customer)}
                            className="text-gray-400 hover:text-teal-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1"
                            aria-label={`Edit ${customer.orgName ?? "customer"}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1"
                            aria-label={`Delete ${customer.orgName ?? "customer"}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add / Edit Customer Form */}
        {showForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Customer" : "Add Customer"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Organisation */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Organisation
                </label>
                <select
                  value={formOrgId}
                  onChange={(e) => setFormOrgId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">No linked org</option>
                  {orgsDropdown?.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Channel, Acquisition Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Acquisition Channel *
                  </label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {CHANNEL_FORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Acquisition Date *
                  </label>
                  <input
                    type="date"
                    value={formAcqDate}
                    onChange={(e) => setFormAcqDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                </div>
              </div>

              {/* Row 3: Acq Cost, Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Acquisition Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAcqCost}
                    onChange={(e) => setFormAcqCost(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Current Plan *
                  </label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {PLAN_FORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Monthly Revenue, Lifetime Revenue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Monthly Revenue ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formMRR}
                    onChange={(e) => setFormMRR(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                    placeholder="499.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Lifetime Revenue ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formLTV}
                    onChange={(e) => setFormLTV(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                    placeholder="5988.00"
                  />
                </div>
              </div>

              {/* Row 5: Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Customer"
                      : "Add Customer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Channel Breakdown Table */}
        {acquisitionStats && acquisitionStats.byChannel.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Channel Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-700/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Churned</th>
                    <th className="px-4 py-3">Avg CAC</th>
                    <th className="px-4 py-3">Avg LTV</th>
                    <th className="px-4 py-3">LTV:CAC</th>
                    <th className="px-4 py-3">MRR</th>
                    <th className="px-4 py-3">Churn Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {acquisitionStats.byChannel.map((ch) => (
                    <tr
                      key={ch.channel}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {channelDisplayName(ch.channel)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{ch.total}</td>
                      <td className="px-4 py-3 text-green-400">{ch.active}</td>
                      <td className="px-4 py-3 text-red-400">{ch.churned}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(ch.avgCAC)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(ch.avgLTV)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {ch.ltvCacRatio}:1
                      </td>
                      <td className="px-4 py-3 text-teal-400">
                        {formatCentsCurrency(ch.mrr)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {ch.churnRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
