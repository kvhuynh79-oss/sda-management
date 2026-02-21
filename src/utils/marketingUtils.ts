/**
 * Marketing Analytics utility functions.
 * All monetary values are stored as cents (integers) to avoid floating-point issues.
 */

// Format cents to "$X,XXX.XX" AUD
export function formatCentsCurrency(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// Format cents to compact "$X.Xk" for large values
export function formatCentsCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 10000) return `$${(dollars / 1000).toFixed(1)}k`;
  return formatCentsCurrency(cents);
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-AU").format(n);
}

// YYYY-MM-DD → "21/02/2026" (AU format)
export function formatDateAU(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Safe division helpers
export function calculateCPC(spend: number, clicks: number): number {
  return clicks === 0 ? 0 : Math.round(spend / clicks);
}

export function calculateCTR(clicks: number, impressions: number): number {
  return impressions === 0 ? 0 : parseFloat(((clicks / impressions) * 100).toFixed(2));
}

export function calculateConversionRate(conversions: number, clicks: number): number {
  return clicks === 0 ? 0 : parseFloat(((conversions / clicks) * 100).toFixed(2));
}

export function calculateCAC(totalSpend: number, totalCustomers: number): number {
  return totalCustomers === 0 ? 0 : Math.round(totalSpend / totalCustomers);
}

export function calculateLTVCACRatio(avgLTV: number, cac: number): number {
  return cac === 0 ? 0 : parseFloat((avgLTV / cac).toFixed(1));
}

// Color thresholds for metric cards — returns Tailwind text color class
export function getMetricColor(metric: string, value: number): string {
  switch (metric) {
    case "spend":
      // Compared against target — caller decides color
      return "text-white";
    case "cpc":
      if (value < 500) return "text-green-400"; // < $5
      if (value <= 800) return "text-yellow-400"; // $5–$8
      return "text-red-400"; // > $8
    case "ctr":
      if (value > 2) return "text-green-400";
      if (value >= 1) return "text-yellow-400";
      return "text-red-400";
    case "conversionRate":
      if (value > 3) return "text-green-400";
      if (value >= 1) return "text-yellow-400";
      return "text-red-400";
    case "cac":
      // Compared against target — caller decides color
      return "text-white";
    case "ltvCac":
      if (value >= 3) return "text-green-400";
      if (value >= 2) return "text-yellow-400";
      return "text-red-400";
    default:
      return "text-white";
  }
}

// Spend color: green if under target, red if over
export function getSpendColor(spend: number, target: number): string {
  if (target === 0) return "text-white";
  return spend <= target ? "text-green-400" : "text-red-400";
}

// CAC color: green if below target, red if above
export function getCACColor(cac: number, target: number): string {
  if (target === 0) return "text-white";
  return cac <= target ? "text-green-400" : "text-red-400";
}

// Progress bar color for goals
export function getProgressColor(current: number, target: number): string {
  if (target === 0) return "bg-gray-600";
  const pct = (current / target) * 100;
  if (pct >= 100) return "bg-green-500";
  if (pct >= 70) return "bg-teal-500";
  if (pct >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

// Date range calculator
export function getDateRange(period: "7d" | "30d" | "90d"): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString().slice(0, 10), end };
}

// Channel display name
export function channelDisplayName(channel: string): string {
  const map: Record<string, string> = {
    google_ads: "Google Ads",
    linkedin_ads: "LinkedIn Ads",
    meta_ads: "Meta Ads",
    organic: "Organic",
    referral: "Referral",
    direct: "Direct",
    other: "Other",
  };
  return map[channel] ?? channel;
}

// Campaign type display name
export function campaignTypeDisplayName(type: string): string {
  const map: Record<string, string> = {
    search: "Search",
    display: "Display",
    sponsored_content: "Sponsored Content",
    message_ads: "Message Ads",
    retargeting: "Retargeting",
    other: "Other",
  };
  return map[type] ?? type;
}

// Plan display name
export function planDisplayName(plan: string): string {
  const map: Record<string, string> = {
    trial: "Trial",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
    churned: "Churned",
  };
  return map[plan] ?? plan;
}

// Trend arrow
export function trendArrow(change: number | null): string {
  if (change === null) return "—";
  if (change > 0) return `↑ ${change.toFixed(1)}%`;
  if (change < 0) return `↓ ${Math.abs(change).toFixed(1)}%`;
  return "→ 0%";
}

export function trendColor(change: number | null, invertedBetter = false): string {
  if (change === null) return "text-gray-400";
  if (invertedBetter) {
    // Lower is better (e.g. CPC, CAC)
    return change < 0 ? "text-green-400" : change > 0 ? "text-red-400" : "text-gray-400";
  }
  return change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400";
}
