// Design tokens for MySDAManager
// Centralized design system constants for consistent UI across the app

// Spacing scale (based on 4px grid)
export const SPACING = {
  0: "0",
  1: "0.25rem", // 4px
  2: "0.5rem",  // 8px
  3: "0.75rem", // 12px
  4: "1rem",    // 16px
  5: "1.25rem", // 20px
  6: "1.5rem",  // 24px
  8: "2rem",    // 32px
  10: "2.5rem", // 40px
  12: "3rem",   // 48px
  16: "4rem",   // 64px
} as const;

// Border radius
export const RADIUS = {
  none: "0",
  sm: "0.125rem",   // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem",   // 6px
  lg: "0.5rem",     // 8px
  xl: "0.75rem",    // 12px
  "2xl": "1rem",    // 16px
  full: "9999px",
} as const;

// Shadows
export const SHADOWS = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

// Z-index scale
export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// Transition durations
export const TRANSITIONS = {
  fast: "150ms",
  DEFAULT: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// Component-specific tokens
export const COMPONENT_TOKENS = {
  // Card styles
  card: {
    bg: "bg-gray-800",
    bgHover: "hover:bg-gray-700/80",
    border: "border border-gray-700",
    borderHover: "hover:bg-gray-700/80",
    rounded: "rounded-lg",
    padding: "p-6",
    paddingSm: "p-4",
  },
  // Button base styles
  button: {
    base: "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    sizes: {
      xs: "px-2 py-1 text-xs",
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    },
  },
  // Input styles
  input: {
    base: "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors",
    error: "border-red-500 focus:ring-red-500",
    disabled: "opacity-50 cursor-not-allowed",
  },
  // Header
  header: {
    bg: "bg-gray-800",
    border: "border-b border-gray-700",
    height: "h-14 lg:h-16",
  },
  // Table styles
  table: {
    container: "bg-gray-800 rounded-lg border border-gray-700 overflow-hidden",
    header: "bg-gray-700",
    headerCell: "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider",
    row: "hover:bg-gray-700 transition-colors",
    cell: "px-4 py-3",
    divider: "divide-y divide-gray-700",
  },
  // Modal styles
  modal: {
    backdrop: "fixed inset-0 bg-black/50 z-40",
    container: "fixed inset-0 z-50 flex items-center justify-center p-4",
    content: "bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto",
    header: "px-6 py-4 border-b border-gray-700",
    body: "px-6 py-4",
    footer: "px-6 py-4 border-t border-gray-700 flex justify-end gap-3",
  },
} as const;

// Brand colors
export const BRAND = {
  primary: "#3b82f6",     // Blue-500
  primaryHover: "#2563eb", // Blue-600
  primaryLight: "#60a5fa", // Blue-400
  secondary: "#6366f1",   // Indigo-500
  accent: "#8b5cf6",      // Violet-500
} as const;

// Semantic colors
export const SEMANTIC = {
  success: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    solid: "bg-green-600",
  },
  warning: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    solid: "bg-yellow-600",
  },
  error: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
    solid: "bg-red-600",
  },
  info: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    solid: "bg-blue-600",
  },
  neutral: {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    border: "border-gray-500/30",
    solid: "bg-gray-600",
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  // Font sizes
  sizes: {
    xs: "text-xs",     // 12px
    sm: "text-sm",     // 14px
    base: "text-base", // 16px
    lg: "text-lg",     // 18px
    xl: "text-xl",     // 20px
    "2xl": "text-2xl", // 24px
    "3xl": "text-3xl", // 30px
    "4xl": "text-4xl", // 36px
  },
  // Font weights
  weights: {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  },
  // Text colors
  colors: {
    primary: "text-white",
    secondary: "text-gray-300",
    muted: "text-gray-400",
    disabled: "text-gray-500",
  },
} as const;

// Helper to combine Tailwind classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
