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
  campaignTypeDisplayName,
} from "@/utils/marketingUtils";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowUpDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelFilter = "" | "google_ads" | "linkedin_ads" | "meta_ads" | "other";
type StatusFilter = "" | "active" | "paused" | "ended";
type SortKey = "name" | "channel" | "dailyBudget";

interface Campaign {
  _id: Id<"marketingCampaigns">;
  name: string;
  channel: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  dailyBudget: number;
  totalBudget?: number;
  targetCPA?: number;
  targetAudience?: string;
  notes?: string;
  createdAt: number;
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

const CURRENT_TAB = "/admin/marketing/campaigns";

// ---------------------------------------------------------------------------
// Channel + type + status options
// ---------------------------------------------------------------------------

const CHANNEL_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: "", label: "All Channels" },
  { value: "google_ads", label: "Google Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];

const CHANNEL_FORM_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "other", label: "Other" },
];

const TYPE_FORM_OPTIONS = [
  { value: "search", label: "Search" },
  { value: "display", label: "Display" },
  { value: "sponsored_content", label: "Sponsored Content" },
  { value: "message_ads", label: "Message Ads" },
  { value: "retargeting", label: "Retargeting" },
  { value: "other", label: "Other" },
];

const STATUS_FORM_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/10 text-green-400",
    paused: "bg-yellow-500/10 text-yellow-400",
    ended: "bg-gray-500/10 text-gray-400",
  };
  const labels: Record<string, string> = {
    active: "Active",
    paused: "Paused",
    ended: "Ended",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-500/10 text-gray-400"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <CampaignsContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function CampaignsContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Filters
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"marketingCampaigns"> | null>(null);
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState("google_ads");
  const [formType, setFormType] = useState("search");
  const [formStatus, setFormStatus] = useState("active");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDailyBudget, setFormDailyBudget] = useState("");
  const [formTotalBudget, setFormTotalBudget] = useState("");
  const [formTargetCPA, setFormTargetCPA] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Queries
  const campaigns = useQuery(
    api.marketingAnalytics.getCampaigns,
    userId && isSuperAdmin
      ? {
          userId,
          ...(channelFilter ? { channel: channelFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        }
      : "skip"
  ) as Campaign[] | undefined;

  // Mutations
  const createCampaign = useMutation(api.marketingAnalytics.createCampaign);
  const updateCampaign = useMutation(api.marketingAnalytics.updateCampaign);
  const deleteCampaign = useMutation(api.marketingAnalytics.deleteCampaign);

  // Computed stats
  const stats = useMemo(() => {
    if (!campaigns) return { active: 0, totalDailyBudget: 0, avgTargetCPA: 0 };
    const activeCampaigns = campaigns.filter((c) => c.status === "active");
    const totalDailyBudget = activeCampaigns.reduce((s, c) => s + c.dailyBudget, 0);
    const withCPA = activeCampaigns.filter((c) => c.targetCPA && c.targetCPA > 0);
    const avgTargetCPA =
      withCPA.length > 0
        ? Math.round(withCPA.reduce((s, c) => s + (c.targetCPA ?? 0), 0) / withCPA.length)
        : 0;
    return { active: activeCampaigns.length, totalDailyBudget, avgTargetCPA };
  }, [campaigns]);

  // Sorted campaigns
  const sortedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    const sorted = [...campaigns].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "channel":
          cmp = a.channel.localeCompare(b.channel);
          break;
        case "dailyBudget":
          cmp = a.dailyBudget - b.dailyBudget;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [campaigns, sortKey, sortAsc]);

  // Form helpers
  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormChannel("google_ads");
    setFormType("search");
    setFormStatus("active");
    setFormStartDate("");
    setFormEndDate("");
    setFormDailyBudget("");
    setFormTotalBudget("");
    setFormTargetCPA("");
    setFormTargetAudience("");
    setFormNotes("");
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(campaign: Campaign) {
    setEditingId(campaign._id);
    setFormName(campaign.name);
    setFormChannel(campaign.channel);
    setFormType(campaign.type);
    setFormStatus(campaign.status);
    setFormStartDate(campaign.startDate);
    setFormEndDate(campaign.endDate ?? "");
    setFormDailyBudget(String(campaign.dailyBudget / 100));
    setFormTotalBudget(campaign.totalBudget ? String(campaign.totalBudget / 100) : "");
    setFormTargetCPA(campaign.targetCPA ? String(campaign.targetCPA / 100) : "");
    setFormTargetAudience(campaign.targetAudience ?? "");
    setFormNotes(campaign.notes ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !formName.trim() || !formStartDate) return;
    setSaving(true);
    try {
      const dailyBudget = Math.round(parseFloat(formDailyBudget || "0") * 100);
      const totalBudget = formTotalBudget
        ? Math.round(parseFloat(formTotalBudget) * 100)
        : undefined;
      const targetCPA = formTargetCPA
        ? Math.round(parseFloat(formTargetCPA) * 100)
        : undefined;

      if (editingId) {
        await updateCampaign({
          userId,
          campaignId: editingId,
          name: formName.trim(),
          channel: formChannel as "google_ads" | "linkedin_ads" | "meta_ads" | "other",
          type: formType as "search" | "display" | "sponsored_content" | "message_ads" | "retargeting" | "other",
          status: formStatus as "active" | "paused" | "ended",
          startDate: formStartDate,
          endDate: formEndDate || undefined,
          dailyBudget,
          totalBudget,
          targetCPA,
          targetAudience: formTargetAudience || undefined,
          notes: formNotes || undefined,
        });
      } else {
        await createCampaign({
          userId,
          name: formName.trim(),
          channel: formChannel as "google_ads" | "linkedin_ads" | "meta_ads" | "other",
          type: formType as "search" | "display" | "sponsored_content" | "message_ads" | "retargeting" | "other",
          status: formStatus as "active" | "paused" | "ended",
          startDate: formStartDate,
          endDate: formEndDate || undefined,
          dailyBudget,
          totalBudget,
          targetCPA,
          targetAudience: formTargetAudience || undefined,
          notes: formNotes || undefined,
        });
      }
      setShowForm(false);
      resetForm();
    } catch (err) {
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(campaignId: Id<"marketingCampaigns">) {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteCampaign({ userId, campaignId });
    } catch (err) {
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
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
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400">
            Manage advertising campaigns across channels
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Active Campaigns</p>
            <p className="text-2xl font-bold text-white">
              {campaigns ? stats.active : "--"}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Total Daily Budget</p>
            <p className="text-2xl font-bold text-teal-400">
              {campaigns ? formatCentsCurrency(stats.totalDailyBudget) : "--"}
            </p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-400 mb-1">Avg Target CPA</p>
            <p className="text-2xl font-bold text-white">
              {campaigns
                ? stats.avgTargetCPA > 0
                  ? formatCentsCurrency(stats.avgTargetCPA)
                  : "N/A"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
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
            Add Campaign
          </button>
        </div>

        {/* Campaign Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          {!campaigns ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ) : sortedCampaigns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No campaigns found.</p>
              <button
                onClick={openCreate}
                className="text-sm text-teal-400 hover:text-teal-300 mt-2"
              >
                Create your first campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-700/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">
                      <button
                        onClick={() => toggleSort("name")}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                      >
                        Name
                        <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        onClick={() => toggleSort("channel")}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                      >
                        Channel
                        <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">
                      <button
                        onClick={() => toggleSort("dailyBudget")}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                      >
                        Daily Budget
                        <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Target CPA</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedCampaigns.map((campaign) => (
                    <tr
                      key={campaign._id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {campaign.name}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {channelDisplayName(campaign.channel)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {campaignTypeDisplayName(campaign.type)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(campaign.dailyBudget)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatDateAU(campaign.startDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {campaign.endDate ? formatDateAU(campaign.endDate) : "--"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {campaign.targetCPA
                          ? formatCentsCurrency(campaign.targetCPA)
                          : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(campaign)}
                            className="text-gray-400 hover:text-teal-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1"
                            aria-label={`Edit ${campaign.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(campaign._id)}
                            className="text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded p-1"
                            aria-label={`Delete ${campaign.name}`}
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

        {/* Create / Edit Form */}
        {showForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Campaign" : "New Campaign"}
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
              {/* Row 1: Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                  placeholder="e.g. Google Search - SDA Keywords"
                />
              </div>

              {/* Row 2: Channel, Type, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Channel *
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
                    Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {TYPE_FORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {STATUS_FORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Start Date, End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Row 4: Daily Budget, Total Budget, Target CPA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Daily Budget ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formDailyBudget}
                    onChange={(e) => setFormDailyBudget(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                    placeholder="50.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Total Budget ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formTotalBudget}
                    onChange={(e) => setFormTotalBudget(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="5000.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Target CPA ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formTargetCPA}
                    onChange={(e) => setFormTargetCPA(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    placeholder="150.00"
                  />
                </div>
              </div>

              {/* Row 5: Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Audience
                </label>
                <textarea
                  value={formTargetAudience}
                  onChange={(e) => setFormTargetAudience(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="e.g. SDA investors, NDIS providers, property managers"
                />
              </div>

              {/* Row 6: Notes */}
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
                      ? "Update Campaign"
                      : "Create Campaign"}
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
      </main>
    </div>
  );
}
