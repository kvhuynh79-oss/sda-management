"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCentsCurrency,
  formatNumber,
} from "@/utils/marketingUtils";
import { ArrowLeft, Save } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Goal {
  _id: Id<"marketingGoals">;
  month: string;
  targetSpend: number;
  targetLeads: number;
  targetCAC: number;
  targetTrials: number;
  targetDemos: number;
  targetPaidConversions: number;
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

const CURRENT_TAB = "/admin/marketing/goals";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDisplay(monthStr: string): string {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <GoalsContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function GoalsContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // Form state
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [formTargetSpend, setFormTargetSpend] = useState("");
  const [formTargetLeads, setFormTargetLeads] = useState("");
  const [formTargetCAC, setFormTargetCAC] = useState("");
  const [formTargetTrials, setFormTargetTrials] = useState("");
  const [formTargetDemos, setFormTargetDemos] = useState("");
  const [formTargetConversions, setFormTargetConversions] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  // Queries
  const goalForMonth = useQuery(
    api.marketingAnalytics.getGoalForMonth,
    userId && isSuperAdmin ? { userId, month: selectedMonth } : "skip"
  ) as Goal | null | undefined;

  const allGoals = useQuery(
    api.marketingAnalytics.getGoals,
    userId && isSuperAdmin ? { userId } : "skip"
  ) as Goal[] | undefined;

  // Mutations
  const upsertGoal = useMutation(api.marketingAnalytics.upsertGoal);

  // Load existing goal into form when month changes or data arrives
  useEffect(() => {
    if (goalForMonth === undefined) return; // still loading
    if (goalForMonth === null) {
      // No goal for this month -- clear form
      setFormTargetSpend("");
      setFormTargetLeads("");
      setFormTargetCAC("");
      setFormTargetTrials("");
      setFormTargetDemos("");
      setFormTargetConversions("");
      setFormNotes("");
    } else {
      setFormTargetSpend(String(goalForMonth.targetSpend / 100));
      setFormTargetLeads(String(goalForMonth.targetLeads));
      setFormTargetCAC(String(goalForMonth.targetCAC / 100));
      setFormTargetTrials(String(goalForMonth.targetTrials));
      setFormTargetDemos(String(goalForMonth.targetDemos));
      setFormTargetConversions(String(goalForMonth.targetPaidConversions));
      setFormNotes(goalForMonth.notes ?? "");
    }
    setSaveSuccess(false);
  }, [goalForMonth, selectedMonth]);

  // Save handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await upsertGoal({
        userId,
        month: selectedMonth,
        targetSpend: Math.round(parseFloat(formTargetSpend || "0") * 100),
        targetLeads: parseInt(formTargetLeads || "0", 10),
        targetCAC: Math.round(parseFloat(formTargetCAC || "0") * 100),
        targetTrials: parseInt(formTargetTrials || "0", 10),
        targetDemos: parseInt(formTargetDemos || "0", 10),
        targetPaidConversions: parseInt(formTargetConversions || "0", 10),
        notes: formNotes || undefined,
      });
      setSaveSuccess(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
    } finally {
      setSaving(false);
    }
  }

  // Select a row from history table
  function selectGoalFromHistory(goal: Goal) {
    setSelectedMonth(goal.month);
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
          <h1 className="text-2xl font-bold text-white">Monthly Goals</h1>
          <p className="text-gray-400">
            Set and track monthly marketing targets
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

        {/* Goal Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">
            {goalForMonth ? "Edit Goals" : "Set Goals"} for{" "}
            <span className="text-teal-400">
              {formatMonthDisplay(selectedMonth)}
            </span>
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Month picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-64 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Target fields in 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Spend ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formTargetSpend}
                  onChange={(e) => setFormTargetSpend(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="5000.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Leads
                </label>
                <input
                  type="number"
                  min="0"
                  value={formTargetLeads}
                  onChange={(e) => setFormTargetLeads(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target CAC ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formTargetCAC}
                  onChange={(e) => setFormTargetCAC(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="100.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Trials
                </label>
                <input
                  type="number"
                  min="0"
                  value={formTargetTrials}
                  onChange={(e) => setFormTargetTrials(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Demos
                </label>
                <input
                  type="number"
                  min="0"
                  value={formTargetDemos}
                  onChange={(e) => setFormTargetDemos(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Paid Conversions
                </label>
                <input
                  type="number"
                  min="0"
                  value={formTargetConversions}
                  onChange={(e) => setFormTargetConversions(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="5"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
                placeholder="Any notes for this month's goals..."
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {saving ? "Saving..." : "Save Goals"}
              </button>
              {saveSuccess && (
                <span className="text-sm text-green-400">
                  Goals saved successfully.
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Goal History Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Goal History
            </h2>
          </div>
          {!allGoals ? (
            <div className="p-8 text-center">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ) : allGoals.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">
                No goals set yet. Use the form above to set your first monthly
                goals.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-700/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Target Spend</th>
                    <th className="px-4 py-3">Target Leads</th>
                    <th className="px-4 py-3">Target CAC</th>
                    <th className="px-4 py-3">Target Trials</th>
                    <th className="px-4 py-3">Target Demos</th>
                    <th className="px-4 py-3">Target Conversions</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {allGoals.map((goal) => (
                    <tr
                      key={goal._id}
                      onClick={() => selectGoalFromHistory(goal)}
                      className={`cursor-pointer transition-colors ${
                        goal.month === selectedMonth
                          ? "bg-teal-600/10 border-l-2 border-l-teal-500"
                          : "hover:bg-gray-700/50"
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectGoalFromHistory(goal);
                        }
                      }}
                      aria-label={`Load goals for ${formatMonthDisplay(goal.month)}`}
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {formatMonthDisplay(goal.month)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(goal.targetSpend)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatNumber(goal.targetLeads)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatCentsCurrency(goal.targetCAC)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatNumber(goal.targetTrials)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatNumber(goal.targetDemos)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatNumber(goal.targetPaidConversions)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                        {goal.notes ?? "--"}
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
