"use client";

import { useEffect, useCallback, useRef } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import Link from "next/link";
import { X, ExternalLink, MapPin, Clock, FileText } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  eventType: string;
  color: string;
  sourceTable: string;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  url: string | null;
  description?: string;
  location?: string;
  propertyName?: string;
}

interface CalendarEventDetailProps {
  event: CalendarEventData | null;
  onClose: () => void;
}

// ── Event type label mapping ──────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  maintenance: "Maintenance",
  preventative: "Preventative Maintenance",
  inspection: "Inspection",
  plan_expiry: "Plan Expiry",
  compliance: "Compliance",
  cert_expiry: "Certificate Expiry",
  doc_expiry: "Document Expiry",
  payment: "Payment",
  appointment: "Appointment",
  external: "External Event",
};

// ── Entity label mapping ──────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  maintenanceRequests: "Maintenance Request",
  inspections: "Inspection",
  tasks: "Task",
  participantPlans: "Participant Plan",
  documents: "Document",
  complianceCertifications: "Certification",
  payments: "Payment",
  preventativeSchedule: "Preventative Schedule",
  incidents: "Incident",
  calendarEvents: "Event",
};

// ── Format date/time display ──────────────────────────────────────

function formatEventDateTime(
  startStr: string,
  endStr: string,
  allDay: boolean
): string {
  const start = parseISO(startStr);
  const end = parseISO(endStr);

  if (allDay) {
    if (isSameDay(start, end)) {
      return format(start, "EEEE, d MMM yyyy");
    }
    return `${format(start, "d MMM yyyy")} - ${format(end, "d MMM yyyy")}`;
  }

  if (isSameDay(start, end)) {
    return `${format(start, "EEEE, d MMM yyyy")}, ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  }

  return `${format(start, "d MMM yyyy, h:mm a")} - ${format(end, "d MMM yyyy, h:mm a")}`;
}

// ── Component ─────────────────────────────────────────────────────

export default function CalendarEventDetail({
  event,
  onClose,
}: CalendarEventDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = event !== null;

  // ── Focus trap and keyboard handling ────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }

      // Focus trap
      if (e.key === "Tab" && isOpen && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, a, [tabindex]:not([tabindex="-1"])'
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
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus close button when panel opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/30 z-40
          transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={event ? `Event details: ${event.title}` : "Event details"}
        className={`
          fixed inset-y-0 right-0 z-40
          w-full sm:w-[400px]
          bg-gray-800 border-l border-gray-700
          shadow-2xl
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {event && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-gray-700">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                  aria-hidden="true"
                />
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: event.color + "20",
                    color: event.color,
                  }}
                >
                  {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                </span>
              </div>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 flex-shrink-0 ml-2"
                aria-label="Close event details"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Title */}
              <h2 className="text-lg font-semibold text-white leading-snug">
                {event.title}
              </h2>

              {/* Date/Time */}
              <div className="flex items-start gap-3">
                <Clock
                  className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-gray-300">
                    {formatEventDateTime(
                      event.start,
                      event.end,
                      event.allDay
                    )}
                  </p>
                  {event.allDay && (
                    <p className="text-xs text-gray-400 mt-0.5">All Day</p>
                  )}
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin
                    className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-300">{event.location}</p>
                </div>
              )}

              {/* Property */}
              {event.propertyName && (
                <div className="flex items-start gap-3">
                  <svg
                    className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <p className="text-sm text-gray-300">{event.propertyName}</p>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="flex items-start gap-3">
                  <FileText
                    className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Source info */}
              {event.sourceTable && (
                <>
                  <div className="border-t border-gray-700" />
                  <div className="text-xs text-gray-400">
                    Source:{" "}
                    {ENTITY_LABELS[event.sourceTable] || event.sourceTable}
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 sm:p-5 border-t border-gray-700 space-y-2">
              {/* Link to source entity */}
              {event.url && (
                <Link
                  href={event.url}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Open{" "}
                  {ENTITY_LABELS[event.sourceTable] || "Details"}
                </Link>
              )}

              {/* Edit/Delete for custom calendar events (disabled for now) */}
              {event.sourceTable === "calendarEvents" && (
                <div className="flex gap-2">
                  <button
                    disabled
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
                    title="Coming soon"
                  >
                    Edit
                  </button>
                  <button
                    disabled
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
                    title="Coming soon"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
