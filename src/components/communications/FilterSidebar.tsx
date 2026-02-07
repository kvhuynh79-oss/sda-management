"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FormInput } from "../forms/FormInput";
import { FormSelect } from "../forms/FormSelect";
import { FormCheckbox } from "../forms/FormCheckbox";

export interface CommunicationFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  contactType?: string;
  complianceCategory?: string;
  requiresFollowUp?: boolean;
  hasFlags?: boolean;
}

interface FilterSidebarProps {
  filters: CommunicationFilters;
  onChange: (filters: CommunicationFilters) => void;
  activeFilterCount?: number;
}

const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "email", label: "Email" },
  { value: "phone_call", label: "Phone Call" },
  { value: "sms", label: "SMS" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const CONTACT_TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "ndia", label: "NDIA" },
  { value: "support_coordinator", label: "Support Coordinator" },
  { value: "sil_provider", label: "SIL Provider" },
  { value: "participant", label: "Participant" },
  { value: "family", label: "Family" },
  { value: "plan_manager", label: "Plan Manager" },
  { value: "ot", label: "OT" },
  { value: "contractor", label: "Contractor" },
  { value: "other", label: "Other" },
];

const COMPLIANCE_OPTIONS = [
  { value: "", label: "All" },
  { value: "incident_related", label: "Incident Related" },
  { value: "complaint", label: "Complaint" },
  { value: "safeguarding", label: "Safeguarding" },
  { value: "plan_review", label: "Plan Review" },
  { value: "access_request", label: "Access Request" },
  { value: "quality_audit", label: "Quality Audit" },
  { value: "advocacy", label: "Advocacy" },
  { value: "routine", label: "Routine" },
];

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700 pb-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        {title}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export function FilterSidebar({ filters, onChange, activeFilterCount }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus trap on mobile
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const focusable = sidebar.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }

      const handleTabTrap = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const currentFocusable = sidebar.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (currentFocusable.length === 0) return;
        const first = currentFocusable[0];
        const last = currentFocusable[currentFocusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", handleTabTrap);
      return () => document.removeEventListener("keydown", handleTabTrap);
    }
  }, [isOpen]);

  const handleClearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  const updateFilter = useCallback(
    (key: keyof CommunicationFilters, value: string | boolean | undefined) => {
      const newFilters = { ...filters };
      if (value === "" || value === undefined || value === false) {
        delete newFilters[key];
      } else {
        (newFilters as any)[key] = value;
      }
      onChange(newFilters);
    },
    [filters, onChange]
  );

  const filterContent = (
    <div className="space-y-4">
      {/* Clear / Apply */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Filters</h2>
        {activeFilterCount && activeFilterCount > 0 ? (
          <button
            onClick={handleClearAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
          >
            Clear All ({activeFilterCount})
          </button>
        ) : null}
      </div>

      {/* Date Range */}
      <CollapsibleSection title="Date Range">
        <FormInput
          label="From"
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
        />
        <FormInput
          label="To"
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
        />
      </CollapsibleSection>

      {/* Communication Type */}
      <CollapsibleSection title="Communication Type">
        <FormSelect
          label="Type"
          options={TYPE_OPTIONS}
          value={filters.type || ""}
          onChange={(e) => updateFilter("type", e.target.value)}
          placeholder=""
        />
      </CollapsibleSection>

      {/* Stakeholder Type */}
      <CollapsibleSection title="Stakeholder Type">
        <FormSelect
          label="Contact Type"
          options={CONTACT_TYPE_OPTIONS}
          value={filters.contactType || ""}
          onChange={(e) => updateFilter("contactType", e.target.value)}
          placeholder=""
        />
      </CollapsibleSection>

      {/* Compliance */}
      <CollapsibleSection title="Compliance" defaultOpen={false}>
        <FormSelect
          label="Category"
          options={COMPLIANCE_OPTIONS}
          value={filters.complianceCategory || ""}
          onChange={(e) => updateFilter("complianceCategory", e.target.value)}
          placeholder=""
        />
      </CollapsibleSection>

      {/* Status Filters */}
      <CollapsibleSection title="Status" defaultOpen={false}>
        <FormCheckbox
          label="Requires follow-up"
          checked={filters.requiresFollowUp || false}
          onChange={(e) => updateFilter("requiresFollowUp", e.target.checked)}
        />
        <FormCheckbox
          label="Has compliance flags"
          checked={filters.hasFlags || false}
          onChange={(e) => updateFilter("hasFlags", e.target.checked)}
        />
      </CollapsibleSection>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Toggle filters"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount && activeFilterCount > 0 ? (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Communication filters"
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-700 z-50 transform transition-transform duration-200 lg:hidden overflow-y-auto p-4 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {filterContent}
      </div>

      {/* Desktop sidebar (always visible) */}
      <nav aria-label="Communication filters" className="hidden lg:block w-64 flex-shrink-0 bg-gray-800/50 rounded-lg p-4">
        {filterContent}
      </nav>
    </>
  );
}

export default FilterSidebar;
