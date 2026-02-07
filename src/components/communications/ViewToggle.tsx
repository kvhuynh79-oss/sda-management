"use client";

import { useRef, useCallback } from "react";

export type ViewMode = "thread" | "timeline" | "stakeholder" | "compliance";

interface ViewToggleProps {
  activeView: ViewMode;
  onChange: (view: ViewMode) => void;
  counts?: {
    threads?: number;
    unread?: number;
    compliance?: number;
  };
}

const VIEW_TABS: { key: ViewMode; label: string; countKey?: keyof NonNullable<ViewToggleProps["counts"]> }[] = [
  { key: "thread", label: "Threads", countKey: "unread" },
  { key: "timeline", label: "Timeline" },
  { key: "stakeholder", label: "Stakeholders" },
  { key: "compliance", label: "Compliance", countKey: "compliance" },
];

export function ViewToggle({ activeView, onChange, counts }: ViewToggleProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let nextIndex = -1;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (index + 1) % VIEW_TABS.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (index - 1 + VIEW_TABS.length) % VIEW_TABS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = VIEW_TABS.length - 1;
      }

      if (nextIndex >= 0) {
        tabRefs.current[nextIndex]?.focus();
        onChange(VIEW_TABS[nextIndex].key);
      }
    },
    [onChange]
  );

  return (
    <div
      role="tablist"
      aria-label="Communication views"
      className="flex overflow-x-auto scrollbar-hide bg-gray-800 rounded-lg p-1 gap-1"
    >
      {VIEW_TABS.map((tab, index) => {
        const isActive = activeView === tab.key;
        const count = tab.countKey && counts ? counts[tab.countKey] : undefined;

        return (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-300 hover:bg-gray-600 hover:text-white"
            }`}
          >
            {tab.label}
            {count != null && count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ViewToggle;
