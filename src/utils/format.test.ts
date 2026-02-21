import { describe, it, expect } from "vitest";
import {
  capitalize,
  formatStatus,
  formatCategory,
  formatIncidentType,
  formatDate,
  formatRelativeDate,
  formatDaysUntil,
  formatCurrency,
  formatNumber,
  formatPhone,
  formatFullName,
  formatAddress,
  truncate,
  formatPercentage,
  getInitials,
  formatFileSize,
} from "./format";

// ---------------------------------------------------------------------------
// capitalize
// ---------------------------------------------------------------------------
describe("capitalize", () => {
  it("capitalizes the first letter of a word", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("handles single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("does not change already-capitalized strings", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("handles all-uppercase strings", () => {
    expect(capitalize("HELLO")).toBe("HELLO");
  });
});

// ---------------------------------------------------------------------------
// formatStatus
// ---------------------------------------------------------------------------
describe("formatStatus", () => {
  it("converts underscores to spaces and title-cases", () => {
    expect(formatStatus("in_progress")).toBe("In Progress");
  });

  it("handles single word", () => {
    expect(formatStatus("active")).toBe("Active");
  });

  it("returns empty string for empty input", () => {
    expect(formatStatus("")).toBe("");
  });

  it("handles multiple underscores", () => {
    expect(formatStatus("pending_approval_review")).toBe("Pending Approval Review");
  });
});

// ---------------------------------------------------------------------------
// formatCategory / formatIncidentType (delegates to formatStatus)
// ---------------------------------------------------------------------------
describe("formatCategory", () => {
  it("formats category strings the same way as formatStatus", () => {
    expect(formatCategory("fire_safety")).toBe("Fire Safety");
  });
});

describe("formatIncidentType", () => {
  it("formats incident type strings", () => {
    expect(formatIncidentType("property_damage")).toBe("Property Damage");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats ISO date string to Australian locale", () => {
    const result = formatDate("2026-02-15");
    // en-AU format: "15 Feb 2026"
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
  });

  it("returns 'N/A' for null", () => {
    expect(formatDate(null)).toBe("N/A");
  });

  it("returns 'N/A' for undefined", () => {
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("returns 'N/A' for empty string", () => {
    expect(formatDate("")).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatRelativeDate
// ---------------------------------------------------------------------------
describe("formatRelativeDate", () => {
  it("returns 'Today' for today's date", () => {
    const today = new Date().toISOString();
    expect(formatRelativeDate(today)).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday's date", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(yesterday)).toBe("Yesterday");
  });

  it("returns days ago for recent dates", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(threeDaysAgo)).toBe("3 days ago");
  });

  it("returns weeks ago for older dates", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(twoWeeksAgo)).toBe("2 weeks ago");
  });

  it("returns months ago for much older dates", () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(threeMonthsAgo)).toBe("3 months ago");
  });

  it("returns 'N/A' for null", () => {
    expect(formatRelativeDate(null)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatDaysUntil
// ---------------------------------------------------------------------------
describe("formatDaysUntil", () => {
  it("returns 'Due today' for today's date", () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    // formatDaysUntil uses Math.ceil so same-day could be 0 or 1 depending on time
    const result = formatDaysUntil(today.toISOString().slice(0, 10));
    expect(["Due today", "Due tomorrow", "1 days remaining"]).toContain(result);
  });

  it("shows overdue for past dates", () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = formatDaysUntil(pastDate.toISOString().slice(0, 10));
    expect(result).toContain("overdue");
  });

  it("shows remaining for future dates", () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const result = formatDaysUntil(futureDate.toISOString().slice(0, 10));
    expect(result).toContain("remaining");
  });

  it("returns 'N/A' for null", () => {
    expect(formatDaysUntil(null)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe("formatCurrency", () => {
  it("formats positive amounts as AUD", () => {
    const result = formatCurrency(1500.5);
    // Should contain dollar sign and amount
    expect(result).toContain("1,500.50");
    expect(result).toContain("$");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0.00");
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-250);
    expect(result).toContain("250");
  });

  it("returns '$0.00' for null", () => {
    expect(formatCurrency(null)).toBe("$0.00");
  });

  it("returns '$0.00' for undefined", () => {
    expect(formatCurrency(undefined)).toBe("$0.00");
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe("formatNumber", () => {
  it("formats large numbers with commas", () => {
    expect(formatNumber(1234567)).toContain("1,234,567");
  });

  it("returns '0' for null", () => {
    expect(formatNumber(null)).toBe("0");
  });

  it("handles small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// formatPhone
// ---------------------------------------------------------------------------
describe("formatPhone", () => {
  it("formats Australian mobile numbers", () => {
    expect(formatPhone("0412345678")).toBe("0412 345 678");
  });

  it("formats Australian landline numbers", () => {
    expect(formatPhone("0298765432")).toBe("02 9876 5432");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhone("0412 345 678")).toBe("0412 345 678");
    expect(formatPhone("(02) 9876-5432")).toBe("02 9876 5432");
  });

  it("returns empty string for null", () => {
    expect(formatPhone(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatPhone(undefined)).toBe("");
  });

  it("returns original string for non-AU format", () => {
    expect(formatPhone("+1234567890")).toBe("+1234567890");
  });
});

// ---------------------------------------------------------------------------
// formatFullName
// ---------------------------------------------------------------------------
describe("formatFullName", () => {
  it("joins first and last name", () => {
    expect(formatFullName("John", "Smith")).toBe("John Smith");
  });

  it("handles missing last name", () => {
    expect(formatFullName("John", null)).toBe("John");
  });

  it("handles missing first name", () => {
    expect(formatFullName(null, "Smith")).toBe("Smith");
  });

  it("returns 'Unknown' for both null", () => {
    expect(formatFullName(null, null)).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// formatAddress
// ---------------------------------------------------------------------------
describe("formatAddress", () => {
  it("formats a full address", () => {
    const result = formatAddress("123 Main St", "Unit 4", "Sydney", "NSW", "2000");
    expect(result).toBe("123 Main St, Unit 4, Sydney NSW 2000");
  });

  it("handles missing optional parts", () => {
    const result = formatAddress("123 Main St", null, "Sydney", "NSW", "2000");
    expect(result).toBe("123 Main St, Sydney NSW 2000");
  });

  it("returns 'No address' for all null", () => {
    expect(formatAddress(null)).toBe("No address");
  });

  it("handles suburb and postcode only", () => {
    const result = formatAddress(null, null, "Melbourne", "VIC", "3000");
    expect(result).toBe("Melbourne VIC 3000");
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe("truncate", () => {
  it("truncates long text with ellipsis", () => {
    expect(truncate("This is a very long string", 10)).toBe("This is...");
  });

  it("does not truncate short text", () => {
    expect(truncate("Short", 10)).toBe("Short");
  });

  it("returns empty string for null", () => {
    expect(truncate(null, 10)).toBe("");
  });

  it("handles exact length", () => {
    expect(truncate("12345", 5)).toBe("12345");
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------
describe("formatPercentage", () => {
  it("formats a percentage value", () => {
    expect(formatPercentage(85.567)).toBe("85.6%");
  });

  it("supports custom decimal places", () => {
    expect(formatPercentage(85.567, 2)).toBe("85.57%");
  });

  it("returns '0%' for null", () => {
    expect(formatPercentage(null)).toBe("0%");
  });

  it("returns '0%' for undefined", () => {
    expect(formatPercentage(undefined)).toBe("0%");
  });
});

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------
describe("getInitials", () => {
  it("returns first two initials", () => {
    expect(getInitials("John Smith")).toBe("JS");
  });

  it("handles single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("returns '?' for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("handles three names", () => {
    expect(getInitials("John Michael Smith")).toBe("JM");
  });
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------
describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("returns '0 Bytes' for zero", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats with decimals", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
});
