"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { enAU } from "date-fns/locale/en-AU";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import CalendarEventDetail from "@/components/calendar/CalendarEventDetail";
import NewEventModal from "@/components/calendar/NewEventModal";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui";

// ── date-fns localizer setup ──────────────────────────────────────
const locales = { "en-AU": enAU };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ── Event type definitions ────────────────────────────────────────

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
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEventData;
}

// ── Event type config ─────────────────────────────────────────────

const EVENT_TYPES: { key: string; label: string; color: string }[] = [
  { key: "task", label: "Tasks", color: "#3b82f6" },
  { key: "maintenance", label: "Maintenance", color: "#f97316" },
  { key: "preventative", label: "Preventative", color: "#a855f7" },
  { key: "inspection", label: "Inspections", color: "#06b6d4" },
  { key: "plan_expiry", label: "Plan Expiry", color: "#ef4444" },
  { key: "compliance", label: "Compliance", color: "#10b981" },
  { key: "cert_expiry", label: "Cert Expiry", color: "#f59e0b" },
  { key: "doc_expiry", label: "Doc Expiry", color: "#6366f1" },
  { key: "payment", label: "Payments", color: "#14b8a6" },
  { key: "appointment", label: "Appointments", color: "#ec4899" },
  { key: "external", label: "External", color: "#8b5cf6" },
];

// ── Main Page Component ───────────────────────────────────────────

export default function CalendarPage() {
  return (
    <RequireAuth>
      <CalendarContent />
    </RequireAuth>
  );
}

function CalendarContent() {
  const { user } = useAuth();

  // ── State ─────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(() => {
    // Default to agenda on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return Views.AGENDA;
    }
    return Views.MONTH;
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null
  );
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(
    () => new Set(EVENT_TYPES.map((t) => t.key))
  );
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [showNewEvent, setShowNewEvent] = useState(false);

  // ── Compute date range for query ──────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    let start: Date;
    let end: Date;

    switch (currentView) {
      case Views.MONTH:
        // Extend range to cover overflow days from adjacent months
        start = subDays(startOfMonth(currentDate), 7);
        end = addDays(endOfMonth(currentDate), 7);
        break;
      case Views.WEEK:
        start = subDays(
          startOfWeek(currentDate, { weekStartsOn: 1 }),
          1
        );
        end = addDays(
          startOfWeek(currentDate, { weekStartsOn: 1 }),
          8
        );
        break;
      case Views.DAY:
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case Views.AGENDA:
        // Show 30 days for agenda
        start = startOfDay(currentDate);
        end = addDays(currentDate, 30);
        break;
      default:
        start = subDays(startOfMonth(currentDate), 7);
        end = addDays(endOfMonth(currentDate), 7);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate, currentView]);

  // ── Data queries ──────────────────────────────────────────────
  const calendarEvents = useQuery(
    api.calendar.getCalendarEvents,
    user
      ? {
          userId: user.id as Id<"users">,
          startDate,
          endDate,
          ...(propertyFilter ? { propertyId: propertyFilter as Id<"properties"> } : {}),
        }
      : "skip"
  );

  // Properties for filter dropdown
  const properties = useQuery(
    api.properties.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // ── Filter events ─────────────────────────────────────────────
  const filteredEvents = useMemo<CalendarEvent[]>(() => {
    if (!calendarEvents) return [];

    return calendarEvents
      .filter((event) => {
        // Filter by enabled event types
        if (!enabledTypes.has(event.eventType)) return false;
        return true;
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: event.allDay,
        resource: event as unknown as CalendarEventData,
      }));
  }, [calendarEvents, enabledTypes]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event.resource);
  }, []);

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleToggleType = useCallback((typeKey: string) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeKey)) {
        next.delete(typeKey);
      } else {
        next.add(typeKey);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setEnabledTypes(new Set(EVENT_TYPES.map((t) => t.key)));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setEnabledTypes(new Set());
  }, []);

  // ── Custom event style ────────────────────────────────────────
  const eventPropGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: event.resource.color,
        border: "none",
        color: "#fff",
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "12px",
        lineHeight: "1.4",
      },
    }),
    []
  );

  // ── Loading state ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="calendar" />
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
          <LoadingScreen fullScreen={false} message="Loading calendar..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <Header currentPage="calendar" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Compliance Watchdog
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Unified view of all scheduled events and deadlines
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setShowNewEvent(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + New Event
            </button>
          </div>
        </div>

        {/* Main layout: sidebar + calendar */}
        <div className="flex gap-6">
          {/* ── Filter sidebar (desktop only) ──────────────────── */}
          <aside
            className="hidden md:block w-56 flex-shrink-0"
            aria-label="Calendar filters"
          >
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sticky top-20">
              <h2 className="text-sm font-semibold text-white mb-4">
                Filters
              </h2>

              {/* Event type filters */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event Types
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSelectAll}
                      className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-1"
                      aria-label="Select all event types"
                    >
                      All
                    </button>
                    <span className="text-gray-600 text-[10px]">/</span>
                    <button
                      onClick={handleDeselectAll}
                      className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-1"
                      aria-label="Deselect all event types"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {EVENT_TYPES.map((type) => (
                    <label
                      key={type.key}
                      className="flex items-center gap-2 cursor-pointer group py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={enabledTypes.has(type.key)}
                        onChange={() => handleToggleType(type.key)}
                        className="sr-only"
                        aria-label={`Show ${type.label} events`}
                      />
                      <span
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                          ${
                            enabledTypes.has(type.key)
                              ? "border-transparent"
                              : "border-gray-500 bg-gray-700"
                          }
                        `}
                        style={
                          enabledTypes.has(type.key)
                            ? { backgroundColor: type.color }
                            : undefined
                        }
                        aria-hidden="true"
                      >
                        {enabledTypes.has(type.key) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-700 my-4" />

              {/* Property filter */}
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Property
                </h3>
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label="Filter by property"
                >
                  <option value="">All Properties</option>
                  {properties?.map((prop) => (
                    <option key={prop._id} value={prop._id}>
                      {prop.propertyName || `${prop.addressLine1}, ${prop.suburb}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event count */}
              {calendarEvents !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    Showing{" "}
                    <span className="text-white font-medium">
                      {filteredEvents.length}
                    </span>{" "}
                    of{" "}
                    <span className="text-white font-medium">
                      {calendarEvents.length}
                    </span>{" "}
                    events
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* ── Calendar area ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {calendarEvents === undefined ? (
              <div className="h-[calc(100vh-200px)] bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                <LoadingScreen
                  fullScreen={false}
                  message="Loading events..."
                />
              </div>
            ) : (
              <div
                className="bg-gray-800 rounded-lg border border-gray-700 p-3 sm:p-4"
                style={{ height: "calc(100vh - 200px)" }}
              >
                <Calendar<CalendarEvent>
                  localizer={localizer}
                  events={filteredEvents}
                  date={currentDate}
                  view={currentView}
                  onNavigate={handleNavigate}
                  onView={handleViewChange}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventPropGetter}
                  views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                  popup
                  selectable={false}
                  style={{ height: "100%" }}
                  messages={{
                    today: "Today",
                    previous: "Back",
                    next: "Next",
                    month: "Month",
                    week: "Week",
                    day: "Day",
                    agenda: "Agenda",
                    noEventsInRange: "No events in this range.",
                    showMore: (total: number) => `+${total} more`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Event detail panel ──────────────────────────────────── */}
      <CalendarEventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* ── New event modal ───────────────────────────────────────── */}
      <NewEventModal
        isOpen={showNewEvent}
        onClose={() => setShowNewEvent(false)}
        userId={user?.id || ""}
        defaultDate={currentDate}
      />
    </div>
  );
}
