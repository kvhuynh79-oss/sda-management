/**
 * Format utilities for consistent display across the app
 */

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a category/status string (e.g., "in_progress" -> "In Progress")
 */
export function formatStatus(status: string): string {
  if (!status) return "";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format maintenance category
 */
export function formatCategory(category: string): string {
  return formatStatus(category);
}

/**
 * Format incident type
 */
export function formatIncidentType(type: string): string {
  return formatStatus(type);
}

/**
 * Format a date string to localized display format
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date to relative time (e.g., "2 days ago")
 */
export function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateStr;
  }
}

/**
 * Format days until/since a date
 */
export function formatDaysUntil(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `${diffDays} days remaining`;
  } catch {
    return dateStr;
  }
}

/**
 * Format currency (AUD)
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat("en-AU").format(num);
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return "";
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Australian mobile (04xx xxx xxx)
  if (digits.length === 10 && digits.startsWith("04")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Australian landline (02 xxxx xxxx)
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Format full name from first/last name
 */
export function formatFullName(
  firstName: string | undefined | null,
  lastName: string | undefined | null
): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(" ") || "Unknown";
}

/**
 * Format property address from components
 */
export function formatAddress(
  addressLine1: string | undefined | null,
  addressLine2?: string | undefined | null,
  suburb?: string | undefined | null,
  state?: string | undefined | null,
  postcode?: string | undefined | null
): string {
  const parts: string[] = [];

  if (addressLine1) parts.push(addressLine1);
  if (addressLine2) parts.push(addressLine2);

  const cityLine = [suburb, state, postcode].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);

  return parts.join(", ") || "No address";
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string | undefined | null, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null) return "0%";
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
