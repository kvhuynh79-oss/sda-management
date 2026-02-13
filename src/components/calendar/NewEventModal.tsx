"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  defaultDate?: Date;
}

const EVENT_TYPE_OPTIONS = [
  { value: "appointment", label: "Appointment" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inspection", label: "Inspection" },
  { value: "task", label: "Task" },
  { value: "compliance", label: "Compliance" },
] as const;

type EventType = "appointment" | "maintenance" | "inspection" | "task" | "compliance" | "external";

// ── Component ─────────────────────────────────────────────────────

export default function NewEventModal({
  isOpen,
  onClose,
  userId,
  defaultDate,
}: NewEventModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ────────────────────────────────────────────────
  const defaultDateStr = defaultDate
    ? format(defaultDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(defaultDateStr);
  const [endTime, setEndTime] = useState("10:00");
  const [eventType, setEventType] = useState<EventType>("appointment");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Queries and mutations ─────────────────────────────────────
  const properties = useQuery(
    api.properties.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const createEvent = useMutation(api.calendar.createEvent);

  // ── Reset form when modal opens ───────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const dateStr = defaultDate
        ? format(defaultDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
      setTitle("");
      setAllDay(false);
      setStartDate(dateStr);
      setStartTime("09:00");
      setEndDate(dateStr);
      setEndTime("10:00");
      setEventType("appointment");
      setDescription("");
      setLocation("");
      setPropertyId("");
      setSaving(false);
      setError("");

      // Focus the title input after a short delay to let the modal render
      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultDate]);

  // ── Keyboard handling (Escape to close, focus trap) ───────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
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

  // ── Prevent body scroll when modal is open ────────────────────
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

  // ── Form submission ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate required fields
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!startDate) {
      setError("Start date is required.");
      return;
    }
    if (!endDate) {
      setError("End date is required.");
      return;
    }

    // Build ISO date/time strings
    let startStr: string;
    let endStr: string;

    if (allDay) {
      startStr = startDate;
      endStr = endDate;
    } else {
      if (!startTime || !endTime) {
        setError("Start time and end time are required for timed events.");
        return;
      }
      startStr = `${startDate}T${startTime}:00`;
      endStr = `${endDate}T${endTime}:00`;

      // Validate end is after start
      if (new Date(endStr) <= new Date(startStr)) {
        setError("End date/time must be after start date/time.");
        return;
      }
    }

    setSaving(true);
    try {
      await createEvent({
        userId: userId as Id<"users">,
        title: title.trim(),
        startTime: startStr,
        endTime: endStr,
        allDay,
        eventType,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(propertyId
          ? { linkedPropertyId: propertyId as Id<"properties"> }
          : {}),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create event. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create new calendar event"
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">New Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg p-1"
            aria-label="Close modal"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Error message */}
          {error && (
            <div
              className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Title <span className="text-red-400">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="event-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 placeholder-gray-400"
              autoComplete="off"
            />
          </div>

          {/* All Day toggle */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="event-allday"
              className="relative inline-flex items-center cursor-pointer"
            >
              <input
                id="event-allday"
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:bg-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-gray-300">All Day</span>
          </div>

          {/* Start Date / Time */}
          <div className={`grid gap-3 ${allDay ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <div>
              <label
                htmlFor="event-start-date"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                id="event-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Auto-update end date if it's before new start date
                  if (e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [color-scheme:dark]"
              />
            </div>
            {!allDay && (
              <div>
                <label
                  htmlFor="event-start-time"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Start Time
                </label>
                <input
                  id="event-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {/* End Date / Time */}
          <div className={`grid gap-3 ${allDay ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <div>
              <label
                htmlFor="event-end-date"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                id="event-end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [color-scheme:dark]"
              />
            </div>
            {!allDay && (
              <div>
                <label
                  htmlFor="event-end-time"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  End Time
                </label>
                <input
                  id="event-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label
              htmlFor="event-type"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Event Type
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="event-description"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="event-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional event description"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="event-location"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Location
            </label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional location"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 placeholder-gray-400"
              autoComplete="off"
            />
          </div>

          {/* Property */}
          <div>
            <label
              htmlFor="event-property"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Property
            </label>
            <select
              id="event-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <option value="">None</option>
              {properties?.map((prop) => (
                <option key={prop._id} value={prop._id}>
                  {prop.propertyName || `${prop.addressLine1}, ${prop.suburb}`}
                </option>
              ))}
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 flex items-center gap-2"
            >
              {saving && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
