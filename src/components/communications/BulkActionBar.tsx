"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const COMPLIANCE_CATEGORIES = [
  { value: "routine", label: "Routine" },
  { value: "incident_related", label: "Incident Related" },
  { value: "complaint", label: "Complaint" },
  { value: "safeguarding", label: "Safeguarding" },
  { value: "plan_review", label: "Plan Review" },
  { value: "access_request", label: "Access Request" },
  { value: "quality_audit", label: "Quality Audit" },
  { value: "advocacy", label: "Advocacy" },
  { value: "none", label: "None" },
] as const;

const FLAG_TYPES = [
  { value: "requires_documentation", label: "Requires Documentation" },
  { value: "time_sensitive", label: "Time Sensitive" },
  { value: "escalation_required", label: "Escalation Required" },
  { value: "ndia_reportable", label: "NDIA Reportable" },
  { value: "legal_hold", label: "Legal Hold" },
] as const;

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onDeselectAll: () => void;
  onActionComplete: () => void;
  userId: string;
}

export function BulkActionBar({
  selectedIds,
  onDeselectAll,
  onActionComplete,
  userId,
}: BulkActionBarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFlagDropdown, setShowFlagDropdown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const flagRef = useRef<HTMLDivElement>(null);

  const bulkMarkAsRead = useMutation(api.communications.bulkMarkAsRead);
  const bulkUpdateCategory = useMutation(api.communications.bulkUpdateCategory);
  const bulkAddFlags = useMutation(api.communications.bulkAddFlags);
  const categoryItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const flagItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const count = selectedIds.size;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (flagRef.current && !flagRef.current.contains(e.target as Node)) {
        setShowFlagDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key: close dropdowns first, then deselect all
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showCategoryDropdown || showFlagDropdown) {
          setShowCategoryDropdown(false);
          setShowFlagDropdown(false);
        } else if (count > 0) {
          onDeselectAll();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [count, onDeselectAll, showCategoryDropdown, showFlagDropdown]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const getIds = useCallback(
    () => [...selectedIds] as Id<"communications">[],
    [selectedIds]
  );

  const handleMarkRead = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await bulkMarkAsRead({
        userId: userId as Id<"users">,
        communicationIds: getIds(),
      });
      showToast(`Marked ${result.updatedCount} as read`);
      onActionComplete();
    } catch (error) {
      console.error("Bulk mark read failed:", error);
      showToast("Failed to mark as read");
    } finally {
      setIsLoading(false);
    }
  }, [bulkMarkAsRead, userId, getIds, showToast, onActionComplete]);

  const handleCategorize = useCallback(
    async (category: string) => {
      setShowCategoryDropdown(false);
      setIsLoading(true);
      try {
        const result = await bulkUpdateCategory({
          userId: userId as Id<"users">,
          communicationIds: getIds(),
          complianceCategory: category as any,
        });
        showToast(`Categorized ${result.updatedCount} items`);
        onActionComplete();
      } catch (error) {
        console.error("Bulk categorize failed:", error);
        showToast("Failed to categorize");
      } finally {
        setIsLoading(false);
      }
    },
    [bulkUpdateCategory, userId, getIds, showToast, onActionComplete]
  );

  const handleAddFlag = useCallback(
    async (flag: string) => {
      setShowFlagDropdown(false);
      setIsLoading(true);
      try {
        const result = await bulkAddFlags({
          userId: userId as Id<"users">,
          communicationIds: getIds(),
          flags: [flag as any],
        });
        showToast(`Flagged ${result.updatedCount} items`);
        onActionComplete();
      } catch (error) {
        console.error("Bulk flag failed:", error);
        showToast("Failed to add flag");
      } finally {
        setIsLoading(false);
      }
    },
    [bulkAddFlags, userId, getIds, showToast, onActionComplete]
  );

  // Focus first item when dropdown opens
  useEffect(() => {
    if (showCategoryDropdown) {
      requestAnimationFrame(() => categoryItemRefs.current[0]?.focus());
    }
  }, [showCategoryDropdown]);

  useEffect(() => {
    if (showFlagDropdown) {
      requestAnimationFrame(() => flagItemRefs.current[0]?.focus());
    }
  }, [showFlagDropdown]);

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent, refs: React.MutableRefObject<(HTMLButtonElement | null)[]>, length: number) => {
      const currentIndex = refs.current.findIndex((el) => el === document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (currentIndex + 1) % length;
        refs.current[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (currentIndex - 1 + length) % length;
        refs.current[prev]?.focus();
      } else if (e.key === "Escape") {
        setShowCategoryDropdown(false);
        setShowFlagDropdown(false);
      }
    },
    []
  );

  if (count === 0) return null;

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Bulk action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 shadow-2xl"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Selection count */}
            <div className="flex items-center gap-2" aria-live="polite">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-white text-sm font-medium">
                {count} item{count !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mark Read */}
              <button
                onClick={handleMarkRead}
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-wait text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Working...
                  </span>
                ) : (
                  "Mark Read"
                )}
              </button>

              {/* Categorize dropdown */}
              <div className="relative" ref={categoryRef}>
                <button
                  onClick={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    setShowFlagDropdown(false);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-wait text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1"
                  aria-expanded={showCategoryDropdown}
                  aria-haspopup="listbox"
                >
                  Categorize
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCategoryDropdown && (
                  <div
                    className="absolute bottom-full mb-1 left-0 bg-gray-700 border border-gray-600 rounded-lg shadow-xl py-1 w-48 z-[60]"
                    role="listbox"
                    aria-label="Compliance categories"
                  >
                    {COMPLIANCE_CATEGORIES.map((cat, i) => (
                      <button
                        key={cat.value}
                        ref={(el) => { categoryItemRefs.current[i] = el; }}
                        onClick={() => handleCategorize(cat.value)}
                        onKeyDown={(e) => handleDropdownKeyDown(e, categoryItemRefs, COMPLIANCE_CATEGORIES.length)}
                        role="option"
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus-visible:bg-gray-600"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Flag dropdown */}
              <div className="relative" ref={flagRef}>
                <button
                  onClick={() => {
                    setShowFlagDropdown(!showFlagDropdown);
                    setShowCategoryDropdown(false);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-wait text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1"
                  aria-expanded={showFlagDropdown}
                  aria-haspopup="listbox"
                >
                  Flag
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFlagDropdown && (
                  <div
                    className="absolute bottom-full mb-1 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-xl py-1 w-52 z-[60]"
                    role="listbox"
                    aria-label="Compliance flags"
                  >
                    {FLAG_TYPES.map((flag, i) => (
                      <button
                        key={flag.value}
                        ref={(el) => { flagItemRefs.current[i] = el; }}
                        onClick={() => handleAddFlag(flag.value)}
                        onKeyDown={(e) => handleDropdownKeyDown(e, flagItemRefs, FLAG_TYPES.length)}
                        role="option"
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus-visible:bg-gray-600"
                      >
                        {flag.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deselect All */}
              <button
                onClick={onDeselectAll}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BulkActionBar;
