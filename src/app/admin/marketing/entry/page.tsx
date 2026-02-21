"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  formatCentsCurrency,
  formatPercentage,
  formatNumber,
  formatDateAU,
  calculateCPC,
  calculateCTR,
  calculateConversionRate,
  channelDisplayName,
} from "@/utils/marketingUtils";
import {
  ArrowLeft,
  Upload,
  Download,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Channel = "google_ads" | "linkedin_ads" | "meta_ads" | "other";

interface FormState {
  date: string;
  channel: Channel;
  impressions: string;
  clicks: string;
  spendDollars: string;
  signups: string;
  demoBookings: string;
  trialStarts: string;
  notes: string;
}

interface BulkRow {
  date: string;
  channel: Channel;
  impressions: string;
  clicks: string;
  spendDollars: string;
  signups: string;
  demoBookings: string;
  trialStarts: string;
}

interface CsvRow {
  date: string;
  channel: Channel;
  impressions: number;
  clicks: number;
  spendDollars: number;
  signups: number;
  demoBookings: number;
  trialStarts: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "google_ads", label: "Google Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "other", label: "Other" },
];

const NAV_TABS = [
  { label: "Overview", href: "/admin/marketing" },
  { label: "Data Entry", href: "/admin/marketing/entry" },
  { label: "Campaigns", href: "/admin/marketing/campaigns" },
  { label: "Customers", href: "/admin/marketing/customers" },
  { label: "Goals", href: "/admin/marketing/goals" },
] as const;

const CSV_HEADERS =
  "Date,Channel,Impressions,Clicks,Spend_AUD,Signups,Demo_Bookings,Trial_Starts,Notes";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    date: todayStr(),
    channel: "google_ads",
    impressions: "",
    clicks: "",
    spendDollars: "",
    signups: "",
    demoBookings: "",
    trialStarts: "",
    notes: "",
  };
}

function parseNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function parseChannel(raw: string): Channel {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (
    lower === "google_ads" ||
    lower === "linkedin_ads" ||
    lower === "meta_ads" ||
    lower === "other"
  ) {
    return lower;
  }
  // Friendly name mapping
  const map: Record<string, Channel> = {
    google: "google_ads",
    "google ads": "google_ads",
    linkedin: "linkedin_ads",
    "linkedin ads": "linkedin_ads",
    meta: "meta_ads",
    "meta ads": "meta_ads",
    facebook: "meta_ads",
    "facebook ads": "meta_ads",
  };
  return map[raw.trim().toLowerCase()] ?? "other";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EntrySkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-6 animate-pulse" aria-hidden="true">
      <div className="h-4 w-32 bg-gray-700 rounded mb-4" />
      <div className="h-64 bg-gray-700 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input component helpers
// ---------------------------------------------------------------------------

const inputCls =
  "w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600";
const labelCls = "block text-sm font-medium text-gray-300 mb-1";

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function MarketingEntryPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <EntryContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function EntryContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;
  const { confirm: confirmDialog } = useConfirmDialog();

  // Mutations
  const createMetric = useMutation(api.marketingAnalytics.createMetric);
  const updateMetric = useMutation(api.marketingAnalytics.updateMetric);
  const deleteMetric = useMutation(api.marketingAnalytics.deleteMetric);

  // Query recent entries
  const recentEntries = useQuery(
    api.marketingAnalytics.getMetrics,
    userId && isSuperAdmin ? { userId, limit: 30 } : "skip"
  );

  // Single entry form state
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<Id<"marketingMetrics"> | null>(null);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk entry state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(todayStr());
  const [bulkEndDate, setBulkEndDate] = useState(todayStr());
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // CSV upload state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvMessage, setCsvMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form field updater
  const updateField = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setFormMessage(null);
    },
    []
  );

  // Auto-calculated preview
  const preview = useMemo(() => {
    const clicks = parseNum(form.clicks);
    const impressions = parseNum(form.impressions);
    const spendCents = Math.round(parseNum(form.spendDollars) * 100);
    const signups = parseNum(form.signups);
    const demos = parseNum(form.demoBookings);
    const trials = parseNum(form.trialStarts);
    const conversions = signups + demos + trials;

    return {
      cpc: calculateCPC(spendCents, clicks),
      ctr: calculateCTR(clicks, impressions),
      conversionRate: calculateConversionRate(conversions, clicks),
    };
  }, [form]);

  // Submit single entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || submitting) return;

    const impressions = parseNum(form.impressions);
    const clicks = parseNum(form.clicks);
    const spendCents = Math.round(parseNum(form.spendDollars) * 100);
    const signups = parseNum(form.signups);
    const demoBookings = parseNum(form.demoBookings);
    const trialStarts = parseNum(form.trialStarts);

    if (impressions < 0 || clicks < 0 || spendCents < 0) {
      setFormMessage({ type: "error", text: "Values cannot be negative." });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateMetric({
          userId,
          metricId: editingId,
          impressions,
          clicks,
          spend: spendCents,
          signups,
          demoBookings,
          trialStarts,
          notes: form.notes || undefined,
        });
        setFormMessage({ type: "success", text: "Metric updated successfully." });
        setEditingId(null);
      } else {
        await createMetric({
          userId,
          date: form.date,
          channel: form.channel,
          impressions,
          clicks,
          spend: spendCents,
          signups,
          demoBookings,
          trialStarts,
          notes: form.notes || undefined,
          entryMethod: "manual",
        });
        setFormMessage({ type: "success", text: "Metric added successfully." });
      }
      setForm(emptyForm());
    } catch (err) {
      setFormMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save metric.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormMessage(null);
  };

  // Edit handler
  const handleEdit = (entry: NonNullable<typeof recentEntries>[number]) => {
    setEditingId(entry._id);
    setForm({
      date: entry.date,
      channel: entry.channel as Channel,
      impressions: String(entry.impressions),
      clicks: String(entry.clicks),
      spendDollars: String(entry.spend / 100),
      signups: String(entry.conversionBreakdown.signups),
      demoBookings: String(entry.conversionBreakdown.demoBookings),
      trialStarts: String(entry.conversionBreakdown.trialStarts),
      notes: entry.notes ?? "",
    });
    setFormMessage(null);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete handler
  const handleDelete = async (metricId: Id<"marketingMetrics">) => {
    if (!userId) return;
    const confirmed = await confirmDialog({
      title: "Delete Metric",
      message: "Are you sure you want to delete this metric entry? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMetric({ userId, metricId });
    } catch {
      // Silently handle - the UI will update reactively
    }
  };

  // Bulk entry: generate rows
  const generateBulkRows = () => {
    const start = new Date(bulkStartDate);
    const end = new Date(bulkEndDate);
    if (start > end) return;

    const rows: BulkRow[] = [];
    const current = new Date(start);
    while (current <= end) {
      rows.push({
        date: current.toISOString().slice(0, 10),
        channel: "google_ads",
        impressions: "",
        clicks: "",
        spendDollars: "",
        signups: "",
        demoBookings: "",
        trialStarts: "",
      });
      current.setDate(current.getDate() + 1);
    }
    setBulkRows(rows);
    setBulkMessage(null);
  };

  // Bulk entry: update a row field
  const updateBulkRow = (index: number, field: keyof BulkRow, value: string) => {
    setBulkRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  // Bulk entry: submit all
  const submitBulkRows = async () => {
    if (!userId || bulkSubmitting) return;
    const validRows = bulkRows.filter(
      (r) => parseNum(r.impressions) > 0 || parseNum(r.clicks) > 0 || parseNum(r.spendDollars) > 0
    );
    if (validRows.length === 0) {
      setBulkMessage({ type: "error", text: "No rows with data to submit." });
      return;
    }

    setBulkSubmitting(true);
    let successCount = 0;
    try {
      for (const row of validRows) {
        await createMetric({
          userId,
          date: row.date,
          channel: row.channel,
          impressions: parseNum(row.impressions),
          clicks: parseNum(row.clicks),
          spend: Math.round(parseNum(row.spendDollars) * 100),
          signups: parseNum(row.signups),
          demoBookings: parseNum(row.demoBookings),
          trialStarts: parseNum(row.trialStarts),
          entryMethod: "manual",
        });
        successCount++;
      }
      setBulkMessage({
        type: "success",
        text: `Successfully added ${successCount} metric${successCount !== 1 ? "s" : ""}.`,
      });
      setBulkRows([]);
    } catch (err) {
      setBulkMessage({
        type: "error",
        text: `Added ${successCount} of ${validRows.length}. Error: ${err instanceof Error ? err.message : "Unknown error"}.`,
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // CSV: download template
  const downloadTemplate = () => {
    const blob = new Blob([CSV_HEADERS + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketing_metrics_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV: parse file
  const parseCsvFile = (file: File) => {
    setCsvError(null);
    setCsvMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setCsvError("CSV file must have a header row and at least one data row.");
          return;
        }

        // Skip header
        const dataLines = lines.slice(1);
        const parsed: CsvRow[] = [];

        for (let i = 0; i < dataLines.length; i++) {
          const cols = dataLines[i].split(",").map((c) => c.trim());
          if (cols.length < 8) {
            setCsvError(`Row ${i + 2} has fewer than 8 columns.`);
            return;
          }

          // Validate date format
          const dateStr = cols[0];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            setCsvError(
              `Row ${i + 2}: Invalid date "${dateStr}". Use YYYY-MM-DD format.`
            );
            return;
          }

          parsed.push({
            date: dateStr,
            channel: parseChannel(cols[1]),
            impressions: parseNum(cols[2]),
            clicks: parseNum(cols[3]),
            spendDollars: parseNum(cols[4]),
            signups: parseNum(cols[5]),
            demoBookings: parseNum(cols[6]),
            trialStarts: parseNum(cols[7]),
            notes: cols[8] ?? "",
          });
        }

        setCsvRows(parsed);
      } catch {
        setCsvError("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  // CSV: drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith(".csv")) {
      parseCsvFile(files[0]);
    } else {
      setCsvError("Please upload a .csv file.");
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      parseCsvFile(files[0]);
    }
  };

  // CSV: import all rows
  const importCsvRows = async () => {
    if (!userId || csvSubmitting || csvRows.length === 0) return;

    setCsvSubmitting(true);
    let successCount = 0;
    try {
      for (const row of csvRows) {
        await createMetric({
          userId,
          date: row.date,
          channel: row.channel,
          impressions: row.impressions,
          clicks: row.clicks,
          spend: Math.round(row.spendDollars * 100),
          signups: row.signups,
          demoBookings: row.demoBookings,
          trialStarts: row.trialStarts,
          notes: row.notes || undefined,
          entryMethod: "csv_upload",
        });
        successCount++;
      }
      setCsvMessage({
        type: "success",
        text: `Successfully imported ${successCount} row${successCount !== 1 ? "s" : ""}.`,
      });
      setCsvRows([]);
    } catch (err) {
      setCsvMessage({
        type: "error",
        text: `Imported ${successCount} of ${csvRows.length}. Error: ${err instanceof Error ? err.message : "Unknown error"}.`,
      });
    } finally {
      setCsvSubmitting(false);
    }
  };

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
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}
        <div className="mb-8">
          <Link
            href="/admin/marketing"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Marketing
          </Link>
          <h1 className="text-2xl font-bold text-white">Data Entry</h1>
          <p className="text-gray-400">
            Add daily ad metrics manually, in bulk, or via CSV upload
          </p>
        </div>

        {/* ================================================================ */}
        {/* Navigation Tabs                                                  */}
        {/* ================================================================ */}
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                tab.href === "/admin/marketing/entry"
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* ================================================================ */}
        {/* Single Entry Form                                                */}
        {/* ================================================================ */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? "Update Metric" : "Add Daily Metrics"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label htmlFor="entry-date" className={labelCls}>
                  Date
                </label>
                <input
                  id="entry-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className={inputCls}
                  required
                  disabled={!!editingId}
                />
              </div>

              {/* Channel */}
              <div>
                <label htmlFor="entry-channel" className={labelCls}>
                  Channel
                </label>
                <select
                  id="entry-channel"
                  value={form.channel}
                  onChange={(e) =>
                    updateField("channel", e.target.value)
                  }
                  className={inputCls}
                  required
                  disabled={!!editingId}
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impressions */}
              <div>
                <label htmlFor="entry-impressions" className={labelCls}>
                  Impressions
                </label>
                <input
                  id="entry-impressions"
                  type="number"
                  min="0"
                  value={form.impressions}
                  onChange={(e) => updateField("impressions", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>

              {/* Clicks */}
              <div>
                <label htmlFor="entry-clicks" className={labelCls}>
                  Clicks
                </label>
                <input
                  id="entry-clicks"
                  type="number"
                  min="0"
                  value={form.clicks}
                  onChange={(e) => updateField("clicks", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>

              {/* Spend */}
              <div>
                <label htmlFor="entry-spend" className={labelCls}>
                  Spend ($AUD)
                </label>
                <input
                  id="entry-spend"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.spendDollars}
                  onChange={(e) => updateField("spendDollars", e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                />
              </div>

              {/* Sign-ups */}
              <div>
                <label htmlFor="entry-signups" className={labelCls}>
                  Sign-ups
                </label>
                <input
                  id="entry-signups"
                  type="number"
                  min="0"
                  value={form.signups}
                  onChange={(e) => updateField("signups", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>

              {/* Demo Bookings */}
              <div>
                <label htmlFor="entry-demos" className={labelCls}>
                  Demo Bookings
                </label>
                <input
                  id="entry-demos"
                  type="number"
                  min="0"
                  value={form.demoBookings}
                  onChange={(e) => updateField("demoBookings", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>

              {/* Trial Starts */}
              <div>
                <label htmlFor="entry-trials" className={labelCls}>
                  Trial Starts
                </label>
                <input
                  id="entry-trials"
                  type="number"
                  min="0"
                  value={form.trialStarts}
                  onChange={(e) => updateField("trialStarts", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label htmlFor="entry-notes" className={labelCls}>
                  Notes (optional)
                </label>
                <textarea
                  id="entry-notes"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Optional notes about this entry..."
                />
              </div>
            </div>

            {/* Auto-calculated preview */}
            <div className="bg-gray-900 rounded p-3 mt-4">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                Auto-calculated Preview
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-400">CPC: </span>
                  <span className="text-white font-medium">
                    {formatCentsCurrency(preview.cpc)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">CTR: </span>
                  <span className="text-white font-medium">
                    {formatPercentage(preview.ctr)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Conversion Rate: </span>
                  <span className="text-white font-medium">
                    {formatPercentage(preview.conversionRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Form message */}
            {formMessage && (
              <div
                className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                  formMessage.type === "success"
                    ? "bg-green-900/30 text-green-400 border border-green-700"
                    : "bg-red-900/30 text-red-400 border border-red-700"
                }`}
                role="alert"
              >
                {formMessage.text}
              </div>
            )}

            {/* Submit button(s) */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Update Metric
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Metric
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-3 py-2"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================================================================ */}
        {/* Bulk Entry Section                                               */}
        {/* ================================================================ */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <button
            type="button"
            onClick={() => setShowBulk((prev) => !prev)}
            className="flex items-center gap-2 text-lg font-semibold text-white w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            {showBulk ? (
              <ChevronUp className="w-5 h-5 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
            )}
            Bulk Entry
          </button>

          {showBulk && (
            <div className="mt-4">
              <div className="flex flex-wrap items-end gap-4 mb-4">
                <div>
                  <label htmlFor="bulk-start" className={labelCls}>
                    Start Date
                  </label>
                  <input
                    id="bulk-start"
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="bulk-end" className={labelCls}>
                    End Date
                  </label>
                  <input
                    id="bulk-end"
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateBulkRows}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Generate Rows
                </button>
              </div>

              {bulkRows.length > 0 && (
                <>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-700 sticky top-0 bg-gray-800">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Date
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Channel
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Impressions
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Clicks
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Spend ($)
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Sign-ups
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Demos
                          </th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">
                            Trials
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, idx) => (
                          <tr
                            key={row.date + idx}
                            className="border-b border-gray-700/50 hover:bg-gray-800/70 transition-colors"
                          >
                            <td className="py-2 px-3 text-white text-xs whitespace-nowrap">
                              {formatDateAU(row.date)}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={row.channel}
                                onChange={(e) =>
                                  updateBulkRow(idx, "channel", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                                aria-label={`Channel for ${row.date}`}
                              >
                                {CHANNELS.map((ch) => (
                                  <option key={ch.value} value={ch.value}>
                                    {ch.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.impressions}
                                onChange={(e) =>
                                  updateBulkRow(idx, "impressions", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0"
                                aria-label={`Impressions for ${row.date}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.clicks}
                                onChange={(e) =>
                                  updateBulkRow(idx, "clicks", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0"
                                aria-label={`Clicks for ${row.date}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.spendDollars}
                                onChange={(e) =>
                                  updateBulkRow(idx, "spendDollars", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0.00"
                                aria-label={`Spend for ${row.date}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.signups}
                                onChange={(e) =>
                                  updateBulkRow(idx, "signups", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0"
                                aria-label={`Sign-ups for ${row.date}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.demoBookings}
                                onChange={(e) =>
                                  updateBulkRow(idx, "demoBookings", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0"
                                aria-label={`Demo bookings for ${row.date}`}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.trialStarts}
                                onChange={(e) =>
                                  updateBulkRow(idx, "trialStarts", e.target.value)
                                }
                                className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder="0"
                                aria-label={`Trial starts for ${row.date}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bulk message */}
                  {bulkMessage && (
                    <div
                      className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                        bulkMessage.type === "success"
                          ? "bg-green-900/30 text-green-400 border border-green-700"
                          : "bg-red-900/30 text-red-400 border border-red-700"
                      }`}
                      role="alert"
                    >
                      {bulkMessage.text}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submitBulkRows}
                    disabled={bulkSubmitting}
                    className="mt-4 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        Submit All
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* CSV Upload Section                                               */}
        {/* ================================================================ */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">CSV Upload</h2>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Download Template
            </button>
          </div>

          {/* Drag and drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <label
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragActive
                  ? "border-teal-600 bg-teal-600/10"
                  : "border-gray-600 bg-gray-700 hover:bg-gray-650"
              }`}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload
                  className={`w-8 h-8 mb-2 ${
                    isDragActive ? "text-teal-400" : "text-gray-400"
                  }`}
                  aria-hidden="true"
                />
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-teal-400">Click to upload</span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload CSV file"
              />
            </label>
          </div>

          {/* CSV error */}
          {csvError && (
            <div
              className="mt-4 px-4 py-2 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-700"
              role="alert"
            >
              {csvError}
            </div>
          )}

          {/* CSV preview */}
          {csvRows.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-300 mb-2">
                Preview: {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} parsed
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-700 sticky top-0 bg-gray-800">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Date
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Channel
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Impressions
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Clicks
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Spend
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Sign-ups
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Demos
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Trials
                      </th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, idx) => (
                      <tr
                        key={`csv-${idx}`}
                        className="border-b border-gray-700/50 hover:bg-gray-800/70 transition-colors"
                      >
                        <td className="py-2 px-3 text-white text-xs">
                          {formatDateAU(row.date)}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {channelDisplayName(row.channel)}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          ${row.spendDollars.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {row.signups}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {row.demoBookings}
                        </td>
                        <td className="py-2 px-3 text-white text-xs">
                          {row.trialStarts}
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-xs truncate max-w-[120px]">
                          {row.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CSV message */}
              {csvMessage && (
                <div
                  className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                    csvMessage.type === "success"
                      ? "bg-green-900/30 text-green-400 border border-green-700"
                      : "bg-red-900/30 text-red-400 border border-red-700"
                  }`}
                  role="alert"
                >
                  {csvMessage.text}
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={importCsvRows}
                  disabled={csvSubmitting}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {csvSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      Import {csvRows.length} Row{csvRows.length !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCsvRows([]);
                    setCsvError(null);
                    setCsvMessage(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-3 py-2"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Recent Entries Table                                              */}
        {/* ================================================================ */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Recent Entries</h2>
            <p className="text-sm text-gray-400 mt-1">
              Last 30 entries across all channels
            </p>
          </div>

          {!recentEntries ? (
            <EntrySkeleton />
          ) : recentEntries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">
                No entries yet. Use the form above to add your first metrics.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Channel
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Impressions
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Clicks
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Spend
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      CPC
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      CTR
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Conv Rate
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Conversions
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Entered By
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="border-b border-gray-700/50 hover:bg-gray-800/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-white whitespace-nowrap">
                        {formatDateAU(entry.date)}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {channelDisplayName(entry.channel)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatNumber(entry.impressions)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatNumber(entry.clicks)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatCentsCurrency(entry.spend)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatCentsCurrency(entry.cpc)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatPercentage(entry.ctr)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatPercentage(entry.conversionRate)}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {formatNumber(entry.conversions)}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {entry.createdByName}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 text-xs mr-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                          aria-label={`Edit entry from ${entry.date}`}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry._id)}
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                          aria-label={`Delete entry from ${entry.date}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
