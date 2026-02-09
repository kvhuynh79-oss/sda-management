"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Data Types
// ---------------------------------------------------------------------------

export interface HelpGuide {
  id: string;
  title: string;
  subtitle: string;
  overview: string;
  sections: GuideSection[];
  relatedLinks?: { label: string; href: string }[];
}

export interface GuideSection {
  id: string;
  title: string;
  icon:
    | "shield"
    | "list"
    | "alert"
    | "check"
    | "clock"
    | "info"
    | "warning"
    | "star"
    | "tool"
    | "file"
    | "users"
    | "home"
    | "dollar";
  color: "red" | "yellow" | "green" | "teal" | "gray" | "purple";
  badge?: string;
  defaultExpanded?: boolean;
  content: GuideContent[];
}

export interface GuideContent {
  type: "text" | "list" | "steps" | "warning" | "tip" | "fields";
  value: string | string[];
}

// ---------------------------------------------------------------------------
// Color / Icon Maps
// ---------------------------------------------------------------------------

const SECTION_COLORS: Record<
  GuideSection["color"],
  { border: string; badge: string; badgeText: string; numberBg: string }
> = {
  red: {
    border: "border-l-4 border-red-500",
    badge: "bg-red-500/20 text-red-400",
    badgeText: "text-red-400",
    numberBg: "bg-red-600",
  },
  yellow: {
    border: "border-l-4 border-yellow-500",
    badge: "bg-yellow-500/20 text-yellow-400",
    badgeText: "text-yellow-400",
    numberBg: "bg-yellow-600",
  },
  green: {
    border: "border-l-4 border-green-500",
    badge: "bg-green-500/20 text-green-400",
    badgeText: "text-green-400",
    numberBg: "bg-green-600",
  },
  teal: {
    border: "border-l-4 border-teal-500",
    badge: "bg-teal-500/20 text-teal-400",
    badgeText: "text-teal-400",
    numberBg: "bg-teal-600",
  },
  gray: {
    border: "border-l-4 border-gray-500",
    badge: "bg-gray-500/20 text-gray-400",
    badgeText: "text-gray-400",
    numberBg: "bg-gray-600",
  },
  purple: {
    border: "border-l-4 border-purple-500",
    badge: "bg-purple-500/20 text-purple-400",
    badgeText: "text-purple-400",
    numberBg: "bg-purple-600",
  },
};

// Inline SVG icon paths (heroicon outlines, 24x24 viewBox)
function SectionIcon({
  icon,
  className,
}: {
  icon: GuideSection["icon"];
  className?: string;
}) {
  const cls = className ?? "w-5 h-5";
  const shared = {
    className: cls,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "shield":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      );
    case "list":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      );
    case "alert":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      );
    case "check":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "clock":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "info":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      );
    case "warning":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      );
    case "star":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
      );
    case "tool":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17l-5.66 5.66a2.12 2.12 0 01-3-3l5.66-5.66m0 0l2.12-2.12a4.24 4.24 0 016 0l.7.7a4.24 4.24 0 010 6l-2.12 2.12m-6.36-6.36l6.36 6.36M21 12a2.25 2.25 0 00-2.25-2.25H18M3 12a2.25 2.25 0 012.25-2.25H6"
          />
        </svg>
      );
    case "file":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      );
    case "users":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      );
    case "home":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      );
    case "dollar":
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return (
        <svg {...shared}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Content Renderers
// ---------------------------------------------------------------------------

function renderContent(item: GuideContent, sectionColor: GuideSection["color"]) {
  const colors = SECTION_COLORS[sectionColor];

  switch (item.type) {
    case "text":
      return (
        <p className="text-gray-300 text-sm leading-relaxed">
          {item.value as string}
        </p>
      );

    case "list": {
      const items = Array.isArray(item.value) ? item.value : [item.value];
      return (
        <ul className="space-y-1.5">
          {items.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "steps": {
      const steps = Array.isArray(item.value) ? item.value : [item.value];
      return (
        <ol className="space-y-2">
          {steps.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`shrink-0 w-6 h-6 rounded-full ${colors.numberBg} text-white text-xs font-bold flex items-center justify-center mt-0.5`}
              >
                {i + 1}
              </span>
              <span className="text-sm text-gray-300 leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      );
    }

    case "warning":
      return (
        <div className="border-l-4 border-red-500 bg-red-500/10 p-3 rounded-r-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-red-300 leading-relaxed">
              {item.value as string}
            </p>
          </div>
        </div>
      );

    case "tip":
      return (
        <div className="border-l-4 border-teal-500 bg-teal-500/10 p-3 rounded-r-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-teal-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
              />
            </svg>
            <p className="text-sm text-teal-300 leading-relaxed">
              {item.value as string}
            </p>
          </div>
        </div>
      );

    case "fields": {
      const fields = Array.isArray(item.value) ? item.value : [item.value];
      return (
        <dl className="space-y-2">
          {fields.map((field, i) => {
            // Expected format: "**Field Name**: Description"
            const match = field.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
            if (match) {
              return (
                <div key={i} className="flex flex-col">
                  <dt className="text-sm font-semibold text-white">{match[1]}</dt>
                  <dd className="text-sm text-gray-400 leading-relaxed">
                    {match[2]}
                  </dd>
                </div>
              );
            }
            // Fallback: render as plain text
            return (
              <div key={i}>
                <p className="text-sm text-gray-300">{field}</p>
              </div>
            );
          })}
        </dl>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// HelpGuidePanel
// ---------------------------------------------------------------------------

interface HelpGuidePanelProps {
  guide: HelpGuide;
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpGuidePanel({
  guide,
  isOpen,
  onClose,
}: HelpGuidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => {
      const defaults = new Set<string>();
      guide.sections.forEach((s) => {
        if (s.defaultExpanded) defaults.add(s.id);
      });
      return defaults;
    }
  );

  // Reset expanded sections when guide changes
  useEffect(() => {
    const defaults = new Set<string>();
    guide.sections.forEach((s) => {
      if (s.defaultExpanded) defaults.add(s.id);
    });
    setExpandedSections(defaults);
  }, [guide]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Slide-in transition
  useEffect(() => {
    if (isOpen) {
      // Capture the element that triggered the panel
      triggerRef.current = document.activeElement as HTMLElement;
      // Allow the off-screen position to paint before transitioning in
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Focus management: focus close button when opening
  useEffect(() => {
    if (isOpen && visible) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen, visible]);

  // Return focus when closing
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const container = panelRef.current;
    if (!container) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusable = container!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (!isOpen) return;

    // Only lock on mobile (< 640px)
    const mql = window.matchMedia("(max-width: 639px)");
    if (mql.matches) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label={guide.title}
        className={`fixed top-0 right-0 z-40 h-full w-full sm:w-[400px] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ---- Sticky Header ---- */}
        <div className="shrink-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {guide.title}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">{guide.subtitle}</p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close guide"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ---- Scrollable Body ---- */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Overview */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {guide.overview}
          </p>

          {/* Sections */}
          {guide.sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const colors = SECTION_COLORS[section.color];
            const contentId = `guide-section-${section.id}`;

            return (
              <div
                key={section.id}
                className={`bg-gray-800 rounded-lg overflow-hidden ${colors.border}`}
              >
                {/* Section Header (toggle) */}
                <button
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-inset rounded-lg"
                >
                  <span className={colors.badgeText}>
                    <SectionIcon icon={section.icon} className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">
                    {section.title}
                  </span>
                  {section.badge && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${colors.badge}`}
                    >
                      {section.badge}
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div
                    id={contentId}
                    className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-700/50"
                  >
                    {section.content.map((contentItem, idx) => (
                      <div key={idx}>
                        {renderContent(contentItem, section.color)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Related Links */}
          {guide.relatedLinks && guide.relatedLinks.length > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Related Links
              </h3>
              <div className="space-y-2">
                {guide.relatedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-1 py-0.5"
                  >
                    <svg
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Footer ---- */}
        <div className="shrink-0 border-t border-gray-700 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {guide.sections.length} section{guide.sections.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
