import { describe, it, expect } from "vitest";
import {
  formatCentsCurrency,
  formatCentsCompact,
  formatPercentage,
  formatNumber,
  formatDateAU,
  calculateCPC,
  calculateCTR,
  calculateConversionRate,
  calculateCAC,
  calculateLTVCACRatio,
  getMetricColor,
  getSpendColor,
  getCACColor,
  getProgressColor,
  getDateRange,
  channelDisplayName,
  campaignTypeDisplayName,
  planDisplayName,
  trendArrow,
  trendColor,
} from "./marketingUtils";

// ---------------------------------------------------------------------------
// formatCentsCurrency
// ---------------------------------------------------------------------------
describe("formatCentsCurrency", () => {
  it("converts cents to AUD currency format", () => {
    const result = formatCentsCurrency(150000);
    expect(result).toContain("1,500.00");
    expect(result).toContain("$");
  });

  it("handles zero cents", () => {
    const result = formatCentsCurrency(0);
    expect(result).toContain("0.00");
  });

  it("handles single cent", () => {
    const result = formatCentsCurrency(1);
    expect(result).toContain("0.01");
  });

  it("handles large values", () => {
    const result = formatCentsCurrency(10000000);
    expect(result).toContain("100,000.00");
  });
});

// ---------------------------------------------------------------------------
// formatCentsCompact
// ---------------------------------------------------------------------------
describe("formatCentsCompact", () => {
  it("returns compact format for values >= $10k", () => {
    expect(formatCentsCompact(1500000)).toBe("$15.0k");
  });

  it("falls back to full format for smaller values", () => {
    const result = formatCentsCompact(50000);
    expect(result).toContain("500.00");
  });

  it("handles exactly $10k", () => {
    expect(formatCentsCompact(1000000)).toBe("$10.0k");
  });
});

// ---------------------------------------------------------------------------
// formatPercentage (marketing version)
// ---------------------------------------------------------------------------
describe("formatPercentage", () => {
  it("formats percentage with 2 decimals by default", () => {
    expect(formatPercentage(85.567)).toBe("85.57%");
  });

  it("supports custom decimal places", () => {
    expect(formatPercentage(85.567, 1)).toBe("85.6%");
  });

  it("formats zero", () => {
    expect(formatPercentage(0)).toBe("0.00%");
  });
});

// ---------------------------------------------------------------------------
// formatNumber (marketing version)
// ---------------------------------------------------------------------------
describe("formatNumber", () => {
  it("formats numbers with locale grouping", () => {
    expect(formatNumber(1234567)).toContain("1,234,567");
  });
});

// ---------------------------------------------------------------------------
// formatDateAU
// ---------------------------------------------------------------------------
describe("formatDateAU", () => {
  it("converts YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateAU("2026-02-15")).toBe("15/02/2026");
  });

  it("returns empty string for empty input", () => {
    expect(formatDateAU("")).toBe("");
  });

  it("handles single-digit day and month", () => {
    expect(formatDateAU("2026-01-05")).toBe("05/01/2026");
  });
});

// ---------------------------------------------------------------------------
// Safe division helpers
// ---------------------------------------------------------------------------
describe("calculateCPC", () => {
  it("calculates cost per click", () => {
    expect(calculateCPC(10000, 100)).toBe(100); // $100 / 100 clicks = 100 cents
  });

  it("returns 0 for zero clicks (division by zero)", () => {
    expect(calculateCPC(10000, 0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    expect(calculateCPC(1000, 3)).toBe(333);
  });
});

describe("calculateCTR", () => {
  it("calculates click-through rate", () => {
    expect(calculateCTR(50, 1000)).toBe(5);
  });

  it("returns 0 for zero impressions", () => {
    expect(calculateCTR(50, 0)).toBe(0);
  });

  it("returns percentage with 2 decimal places", () => {
    expect(calculateCTR(3, 1000)).toBe(0.3);
  });
});

describe("calculateConversionRate", () => {
  it("calculates conversion rate", () => {
    expect(calculateConversionRate(10, 100)).toBe(10);
  });

  it("returns 0 for zero clicks", () => {
    expect(calculateConversionRate(10, 0)).toBe(0);
  });
});

describe("calculateCAC", () => {
  it("calculates customer acquisition cost", () => {
    expect(calculateCAC(100000, 10)).toBe(10000);
  });

  it("returns 0 for zero customers", () => {
    expect(calculateCAC(100000, 0)).toBe(0);
  });
});

describe("calculateLTVCACRatio", () => {
  it("calculates LTV:CAC ratio", () => {
    expect(calculateLTVCACRatio(30000, 10000)).toBe(3);
  });

  it("returns 0 for zero CAC", () => {
    expect(calculateLTVCACRatio(30000, 0)).toBe(0);
  });

  it("returns ratio with 1 decimal place", () => {
    expect(calculateLTVCACRatio(25000, 10000)).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// Color threshold helpers
// ---------------------------------------------------------------------------
describe("getMetricColor", () => {
  it("returns green for low CPC (<$5 = <500 cents)", () => {
    expect(getMetricColor("cpc", 300)).toBe("text-green-400");
  });

  it("returns yellow for medium CPC ($5-$8 = 500-800 cents)", () => {
    expect(getMetricColor("cpc", 600)).toBe("text-yellow-400");
  });

  it("returns red for high CPC (>$8 = >800 cents)", () => {
    expect(getMetricColor("cpc", 900)).toBe("text-red-400");
  });

  it("returns green for high CTR (>2%)", () => {
    expect(getMetricColor("ctr", 3)).toBe("text-green-400");
  });

  it("returns red for low CTR (<1%)", () => {
    expect(getMetricColor("ctr", 0.5)).toBe("text-red-400");
  });

  it("returns green for high conversion rate (>3%)", () => {
    expect(getMetricColor("conversionRate", 5)).toBe("text-green-400");
  });

  it("returns green for good LTV:CAC ratio (>=3)", () => {
    expect(getMetricColor("ltvCac", 4)).toBe("text-green-400");
  });

  it("returns red for bad LTV:CAC ratio (<2)", () => {
    expect(getMetricColor("ltvCac", 1.5)).toBe("text-red-400");
  });

  it("returns text-white for spend (caller decides)", () => {
    expect(getMetricColor("spend", 5000)).toBe("text-white");
  });

  it("returns text-white for unknown metrics", () => {
    expect(getMetricColor("unknown_metric", 100)).toBe("text-white");
  });
});

describe("getSpendColor", () => {
  it("returns green when under target", () => {
    expect(getSpendColor(5000, 10000)).toBe("text-green-400");
  });

  it("returns red when over target", () => {
    expect(getSpendColor(15000, 10000)).toBe("text-red-400");
  });

  it("returns text-white when target is zero", () => {
    expect(getSpendColor(5000, 0)).toBe("text-white");
  });
});

describe("getCACColor", () => {
  it("returns green when CAC below target", () => {
    expect(getCACColor(5000, 10000)).toBe("text-green-400");
  });

  it("returns red when CAC above target", () => {
    expect(getCACColor(15000, 10000)).toBe("text-red-400");
  });
});

describe("getProgressColor", () => {
  it("returns green for 100% or more", () => {
    expect(getProgressColor(100, 100)).toBe("bg-green-500");
  });

  it("returns teal for 70-99%", () => {
    expect(getProgressColor(80, 100)).toBe("bg-teal-500");
  });

  it("returns yellow for 40-69%", () => {
    expect(getProgressColor(50, 100)).toBe("bg-yellow-500");
  });

  it("returns red for below 40%", () => {
    expect(getProgressColor(20, 100)).toBe("bg-red-500");
  });

  it("returns gray for zero target", () => {
    expect(getProgressColor(50, 0)).toBe("bg-gray-600");
  });
});

// ---------------------------------------------------------------------------
// getDateRange
// ---------------------------------------------------------------------------
describe("getDateRange", () => {
  it("returns a 7-day date range", () => {
    const { start, end } = getDateRange("7d");
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBe(7);
  });

  it("returns a 30-day date range", () => {
    const { start, end } = getDateRange("30d");
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBe(30);
  });

  it("returns a 90-day date range", () => {
    const { start, end } = getDateRange("90d");
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    expect(days).toBe(90);
  });

  it("end date is today", () => {
    const { end } = getDateRange("7d");
    const today = new Date().toISOString().slice(0, 10);
    expect(end).toBe(today);
  });
});

// ---------------------------------------------------------------------------
// Display name lookups
// ---------------------------------------------------------------------------
describe("channelDisplayName", () => {
  it("maps known channels to display names", () => {
    expect(channelDisplayName("google_ads")).toBe("Google Ads");
    expect(channelDisplayName("linkedin_ads")).toBe("LinkedIn Ads");
    expect(channelDisplayName("meta_ads")).toBe("Meta Ads");
    expect(channelDisplayName("organic")).toBe("Organic");
  });

  it("returns raw value for unknown channels", () => {
    expect(channelDisplayName("unknown_channel")).toBe("unknown_channel");
  });
});

describe("campaignTypeDisplayName", () => {
  it("maps known types to display names", () => {
    expect(campaignTypeDisplayName("search")).toBe("Search");
    expect(campaignTypeDisplayName("sponsored_content")).toBe("Sponsored Content");
  });

  it("returns raw value for unknown types", () => {
    expect(campaignTypeDisplayName("custom_type")).toBe("custom_type");
  });
});

describe("planDisplayName", () => {
  it("maps known plans to display names", () => {
    expect(planDisplayName("starter")).toBe("Starter");
    expect(planDisplayName("professional")).toBe("Professional");
    expect(planDisplayName("enterprise")).toBe("Enterprise");
    expect(planDisplayName("trial")).toBe("Trial");
    expect(planDisplayName("churned")).toBe("Churned");
  });

  it("returns raw value for unknown plans", () => {
    expect(planDisplayName("custom_plan")).toBe("custom_plan");
  });
});

// ---------------------------------------------------------------------------
// Trend helpers
// ---------------------------------------------------------------------------
describe("trendArrow", () => {
  it("shows up arrow for positive change", () => {
    expect(trendArrow(5.3)).toContain("5.3%");
  });

  it("shows down arrow for negative change", () => {
    const result = trendArrow(-2.1);
    expect(result).toContain("2.1%");
  });

  it("shows flat arrow for zero", () => {
    expect(trendArrow(0)).toBe("→ 0%");
  });

  it("returns em dash for null", () => {
    expect(trendArrow(null)).toBe("—");
  });
});

describe("trendColor", () => {
  it("returns green for positive change by default", () => {
    expect(trendColor(5)).toBe("text-green-400");
  });

  it("returns red for negative change by default", () => {
    expect(trendColor(-5)).toBe("text-red-400");
  });

  it("returns gray for null", () => {
    expect(trendColor(null)).toBe("text-gray-400");
  });

  it("inverts colors when invertedBetter is true", () => {
    // Lower is better (e.g., CPC, CAC)
    expect(trendColor(-5, true)).toBe("text-green-400");
    expect(trendColor(5, true)).toBe("text-red-400");
  });

  it("returns gray for zero change", () => {
    expect(trendColor(0)).toBe("text-gray-400");
  });
});
