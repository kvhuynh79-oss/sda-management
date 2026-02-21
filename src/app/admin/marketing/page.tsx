"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCentsCurrency,
  formatPercentage,
  formatNumber,
  getMetricColor,
  getSpendColor,
  getCACColor,
  getProgressColor,
  channelDisplayName,
  trendArrow,
  trendColor,
} from "@/utils/marketingUtils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Period = "7d" | "30d" | "90d";

interface ChannelStat {
  channel: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
  spendPct: number;
  spendTrend: number | null;
  conversionsTrend: number | null;
}

interface FunnelStage {
  name: string;
  count: number;
  dropOff: number;
}

interface TimeSeriesPoint {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  signups: number;
  demoBookings: number;
  trialStarts: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
}

interface OverviewData {
  totalSpend: number;
  targetSpend: number;
  weeklySpend: number;
  totalConversions: number;
  targetLeads: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
  cac: number;
  targetCAC: number;
  avgLTV: number;
  ltvCacRatio: number;
  signups: number;
  demoBookings: number;
  trialStarts: number;
  targetTrials: number;
  targetDemos: number;
  targetPaidConversions: number;
  adMRR: number;
  spendChange: number | null;
  conversionsChange: number | null;
  channelStats: ChannelStat[];
  totalCustomers: number;
  totalAdCustomers: number;
}

// ---------------------------------------------------------------------------
// Navigation tabs config
// ---------------------------------------------------------------------------

const NAV_TABS = [
  { label: "Overview", href: "/admin/marketing", active: true },
  { label: "Data Entry", href: "/admin/marketing/entry", active: false },
  { label: "Campaigns", href: "/admin/marketing/campaigns", active: false },
  { label: "Customers", href: "/admin/marketing/customers", active: false },
  { label: "Goals", href: "/admin/marketing/goals", active: false },
] as const;

// ---------------------------------------------------------------------------
// Loading skeletons
// ---------------------------------------------------------------------------

function StatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800 rounded-lg p-6 animate-pulse"
          aria-hidden="true"
        >
          <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
          <div className="h-8 w-16 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
      <div className="h-4 w-40 bg-gray-700 rounded mb-4" />
      <div className="h-64 bg-gray-700/50 rounded" />
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="bg-gray-800 rounded-lg p-4 animate-pulse w-32 h-20" aria-hidden="true">
            <div className="h-3 w-16 bg-gray-700 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-700 rounded" />
          </div>
          {i < 5 && <ChevronRight className="w-4 h-4 text-gray-600" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  subtitle,
  colorClass,
}: {
  label: string;
  value: string;
  subtitle?: string;
  colorClass: string;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend indicator
// ---------------------------------------------------------------------------

function TrendIndicator({
  change,
  invertedBetter = false,
  label,
}: {
  change: number | null;
  invertedBetter?: boolean;
  label: string;
}) {
  const arrow = trendArrow(change);
  const color = trendColor(change, invertedBetter);
  const Icon =
    change === null
      ? Minus
      : change > 0
        ? TrendingUp
        : change < 0
          ? TrendingDown
          : Minus;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`} aria-label={`${label}: ${arrow}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {arrow}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Period Toggle
// ---------------------------------------------------------------------------

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex bg-gray-700 rounded-lg overflow-hidden" role="group" aria-label="Select time period">
      {(["7d", "30d", "90d"] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
            period === p
              ? "bg-teal-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom recharts tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.name.toLowerCase().includes("spend")
            ? formatCentsCurrency(entry.value)
            : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page export
// ---------------------------------------------------------------------------

export default function MarketingPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <MarketingDashboardContent />
    </RequireAuth>
  );
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function MarketingDashboardContent() {
  const { user } = useAuth();
  const userId = user ? (user.id as Id<"users">) : undefined;
  const dbUser = useQuery(api.auth.getUser, userId ? { userId } : "skip");
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  // State
  const [period, setPeriod] = useState<Period>("30d");
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);

  // Queries — only fire when super admin confirmed
  const overview = useQuery(
    api.marketingAnalytics.getMarketingOverview,
    userId && isSuperAdmin ? { userId } : "skip"
  ) as OverviewData | undefined;

  const timeSeries = useQuery(
    api.marketingAnalytics.getMarketingTimeSeries,
    userId && isSuperAdmin
      ? { userId, period, ...(channelFilter ? { channel: channelFilter } : {}) }
      : "skip"
  ) as TimeSeriesPoint[] | undefined;

  const funnel = useQuery(
    api.marketingAnalytics.getMarketingFunnel,
    userId && isSuperAdmin
      ? { userId, ...(channelFilter ? { channel: channelFilter } : {}) }
      : "skip"
  ) as FunnelStage[] | undefined;

  // Recharts data: convert spend from cents to dollars for readability
  const chartData = useMemo(() => {
    if (!timeSeries) return [];
    return timeSeries.map((d) => ({
      ...d,
      spendDollars: d.spend / 100,
      dateLabel: d.date.slice(5), // MM-DD
    }));
  }, [timeSeries]);

  // Channel comparison chart data
  const channelChartData = useMemo(() => {
    if (!overview) return [];
    return overview.channelStats.map((ch) => ({
      channel: channelDisplayName(ch.channel),
      CPC: ch.cpc / 100,
      CTR: ch.ctr,
      "Conv. Rate": ch.conversionRate,
    }));
  }, [overview]);

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
            href="/admin/platform"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Platform
          </Link>
          <h1 className="text-2xl font-bold text-white">Marketing Analytics</h1>
          <p className="text-gray-400">
            Track paid advertising performance across channels
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
                tab.active
                  ? "bg-teal-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* ================================================================ */}
        {/* Row 1: Key Metric Cards                                          */}
        {/* ================================================================ */}
        {!overview ? (
          <StatsSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <MetricCard
              label="Total Ad Spend"
              value={formatCentsCurrency(overview.totalSpend)}
              subtitle={`vs ${formatCentsCurrency(overview.targetSpend)} target`}
              colorClass={getSpendColor(overview.totalSpend, overview.targetSpend)}
            />
            <MetricCard
              label="CPC"
              value={formatCentsCurrency(overview.cpc)}
              subtitle="avg across channels"
              colorClass={getMetricColor("cpc", overview.cpc)}
            />
            <MetricCard
              label="CTR"
              value={formatPercentage(overview.ctr)}
              subtitle="avg across channels"
              colorClass={getMetricColor("ctr", overview.ctr)}
            />
            <MetricCard
              label="Conversion Rate"
              value={formatPercentage(overview.conversionRate)}
              colorClass={getMetricColor("conversionRate", overview.conversionRate)}
            />
            <MetricCard
              label="CAC"
              value={formatCentsCurrency(overview.cac)}
              subtitle={`vs ${formatCentsCurrency(overview.targetCAC)} target`}
              colorClass={getCACColor(overview.cac, overview.targetCAC)}
            />
            <MetricCard
              label="LTV:CAC"
              value={`${overview.ltvCacRatio}:1`}
              colorClass={getMetricColor("ltvCac", overview.ltvCacRatio)}
            />
          </div>
        )}

        {/* ================================================================ */}
        {/* Row 2: Channel Comparison                                        */}
        {/* ================================================================ */}
        {!overview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : overview.channelStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {overview.channelStats.map((ch) => (
              <div
                key={ch.channel}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {channelDisplayName(ch.channel)}
                  </h3>
                  <span className="text-xs font-medium text-teal-400 bg-teal-600/20 px-2 py-1 rounded-full">
                    {ch.spendPct}% of total
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Spend</p>
                    <p className="text-sm font-semibold text-white">
                      {formatCentsCurrency(ch.spend)}
                    </p>
                    <TrendIndicator
                      change={ch.spendTrend}
                      invertedBetter
                      label="Spend trend"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CPC</p>
                    <p className={`text-sm font-semibold ${getMetricColor("cpc", ch.cpc)}`}>
                      {formatCentsCurrency(ch.cpc)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">CTR</p>
                    <p className={`text-sm font-semibold ${getMetricColor("ctr", ch.ctr)}`}>
                      {formatPercentage(ch.ctr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Conversions</p>
                    <p className="text-sm font-semibold text-white">
                      {formatNumber(ch.conversions)}
                    </p>
                    <TrendIndicator
                      change={ch.conversionsTrend}
                      label="Conversions trend"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Conv. Rate</p>
                    <p className={`text-sm font-semibold ${getMetricColor("conversionRate", ch.conversionRate)}`}>
                      {formatPercentage(ch.conversionRate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center mb-8">
            <p className="text-gray-400">No channel data for this month yet.</p>
            <Link
              href="/admin/marketing/entry"
              className="text-sm text-teal-400 hover:text-teal-300 mt-2 inline-block"
            >
              Add your first data entry
            </Link>
          </div>
        )}

        {/* ================================================================ */}
        {/* Row 3: Charts (Spend & Conversions + Channel Performance)        */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Left: Spend & Conversions Over Time */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Spend &amp; Conversions Over Time
              </h3>
              <PeriodToggle period={period} onChange={setPeriod} />
            </div>
            {!timeSeries ? (
              <div className="h-64 bg-gray-700/30 rounded animate-pulse" aria-hidden="true" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No data for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#4B5563" }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#4B5563" }}
                    tickFormatter={(v: number) => `$${v}`}
                    label={{
                      value: "Spend ($)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#9CA3AF", fontSize: 11 },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#4B5563" }}
                    label={{
                      value: "Conversions",
                      angle: 90,
                      position: "insideRight",
                      style: { fill: "#9CA3AF", fontSize: 11 },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="spendDollars"
                    name="Spend ($)"
                    fill="#0d9488"
                    opacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    dataKey="conversions"
                    name="Conversions"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right: Channel Performance Comparison */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Channel Performance
            </h3>
            {!overview ? (
              <div className="h-64 bg-gray-700/30 rounded animate-pulse" aria-hidden="true" />
            ) : channelChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400 text-sm">No channel data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={channelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="channel"
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#4B5563" }}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#4B5563" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#9CA3AF" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9CA3AF" }} />
                  <Bar dataKey="CPC" fill="#0d9488" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="CTR" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Conv. Rate" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* Row 4: Funnel Visualization                                      */}
        {/* ================================================================ */}
        <section className="mb-8" aria-labelledby="funnel-heading">
          <h2
            id="funnel-heading"
            className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4"
          >
            Conversion Funnel (This Month)
          </h2>
          {!funnel ? (
            <FunnelSkeleton />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {funnel.map((stage, idx) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <div
                    className={`rounded-lg p-4 border ${
                      stage.dropOff > 80 && idx > 0
                        ? "bg-red-900/30 border-red-700/50"
                        : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    <p className="text-xs text-gray-400 mb-1">{stage.name}</p>
                    <p className="text-lg font-bold text-white">
                      {formatNumber(stage.count)}
                    </p>
                    {idx > 0 && (
                      <p
                        className={`text-xs mt-1 ${
                          stage.dropOff > 80
                            ? "text-red-400"
                            : stage.dropOff > 60
                              ? "text-yellow-400"
                              : "text-gray-400"
                        }`}
                      >
                        {stage.dropOff}% drop-off
                      </p>
                    )}
                  </div>
                  {idx < funnel.length - 1 && (
                    <ChevronRight
                      className="w-5 h-5 text-gray-600 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Row 5: Monthly Progress                                          */}
        {/* ================================================================ */}
        {!overview ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8 animate-pulse">
            <div className="h-4 w-40 bg-gray-700 rounded mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-3">
                <div className="h-3 w-24 bg-gray-700 rounded mb-2" />
                <div className="h-4 bg-gray-700/50 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <section
            className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8"
            aria-labelledby="monthly-progress-heading"
          >
            <h2
              id="monthly-progress-heading"
              className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4"
            >
              Monthly Progress vs Goals
            </h2>
            <div className="space-y-4">
              <ProgressBar
                label="Ad Spend"
                current={overview.totalSpend}
                target={overview.targetSpend}
                formatFn={formatCentsCurrency}
              />
              <ProgressBar
                label="Leads (Sign-ups)"
                current={overview.signups}
                target={overview.targetLeads}
                formatFn={formatNumber}
              />
              <ProgressBar
                label="Demo Bookings"
                current={overview.demoBookings}
                target={overview.targetDemos}
                formatFn={formatNumber}
              />
              <ProgressBar
                label="Trial Starts"
                current={overview.trialStarts}
                target={overview.targetTrials}
                formatFn={formatNumber}
              />
              <ProgressBar
                label="Ad MRR"
                current={overview.adMRR}
                target={
                  overview.targetPaidConversions > 0
                    ? overview.targetPaidConversions * 49900 // rough estimate based on starter price
                    : 0
                }
                formatFn={formatCentsCurrency}
              />
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* Row 6: Quick Link to Data Entry                                  */}
        {/* ================================================================ */}
        <section className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Recent Activity
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Manage daily ad metric entries and track historical data.
              </p>
            </div>
            <Link
              href="/admin/marketing/entry"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              View All Entries
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressBar component
// ---------------------------------------------------------------------------

function ProgressBar({
  label,
  current,
  target,
  formatFn,
}: {
  label: string;
  current: number;
  target: number;
  formatFn: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const colorClass = getProgressColor(current, target);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm text-gray-400">
          {formatFn(current)} / {formatFn(target)}
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(pct)}%`}
        />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{Math.round(pct)}% of target</p>
    </div>
  );
}
