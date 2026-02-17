"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LifeBuoy, X, Camera, Loader2, CheckCircle2 } from "lucide-react";

type Severity = "critical" | "high" | "normal" | "low";
type Category = "bug" | "how_to" | "feature_request" | "billing" | "data_issue" | "other";

/**
 * Passively read the current user from localStorage without triggering
 * a redirect to /login. Returns null on public pages where no user is
 * logged in.
 */
function usePassiveAuth(): { id: string; role: string } | null {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sda_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const id = parsed.id || parsed._id;
        if (id) {
          setUser({ id, role: parsed.role });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  return user;
}

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "how_to", label: "How-to Question" },
  { value: "feature_request", label: "Feature Request" },
  { value: "billing", label: "Billing" },
  { value: "data_issue", label: "Data Issue" },
  { value: "other", label: "Other" },
];

export default function SupportButton() {
  const user = usePassiveAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [category, setCategory] = useState<Category>("bug");
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Convex queries and mutations
  const tickets = useQuery(
    api.supportTickets.getByOrganization,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const createTicket = useMutation(api.supportTickets.create);
  const generateUploadUrl = useMutation(api.supportTickets.generateUploadUrl);

  // Count open tickets for badge
  const openTicketCount = tickets?.filter(
    (t) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_on_customer"
  ).length ?? 0;

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Close panel on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the trigger button
        const triggerButton = document.getElementById("support-trigger-button");
        if (triggerButton && triggerButton.contains(e.target as Node)) return;
        if (isOpen && !isSubmitting) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isSubmitting]);

  // Prevent body scroll when open on mobile
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

  // Auto-close after success
  useEffect(() => {
    if (successTicketNumber) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setSuccessTicketNumber(null);
        resetForm();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successTicketNumber]);

  const resetForm = useCallback(() => {
    setSubject("");
    setDescription("");
    setSeverity("normal");
    setCategory("bug");
    setScreenshotBlob(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    setError("");
  }, [screenshotPreview]);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    setError("");

    // Store refs for restoration
    const panel = panelRef.current;
    const triggerButton = document.getElementById("support-trigger-button");
    const backdrop = panel?.previousElementSibling as HTMLElement | null;

    const restoreVisibility = () => {
      if (panel) panel.style.display = "";
      if (triggerButton) triggerButton.style.display = "";
      if (backdrop) backdrop.style.display = "";
    };

    try {
      // Temporarily hide the support UI so it doesn't appear in the screenshot
      if (panel) panel.style.display = "none";
      if (triggerButton) triggerButton.style.display = "none";
      if (backdrop) backdrop.style.display = "none";

      // Small delay to let the browser repaint
      await new Promise((r) => setTimeout(r, 100));

      // Dynamic import of html2canvas - handle both ESM and CJS exports
      const mod = await import("html2canvas");
      const html2canvas = (typeof mod.default === "function" ? mod.default : mod) as (
        element: HTMLElement,
        options?: Record<string, unknown>
      ) => Promise<HTMLCanvasElement>;

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        backgroundColor: "#111827",
        // Ignore cross-origin images that would taint the canvas
        ignoreElements: (el: Element) => {
          if (el.tagName === "IFRAME") return true;
          if (el.tagName === "VIDEO") return true;
          return false;
        },
      });

      restoreVisibility();

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 0.85);
      });

      if (blob) {
        if (screenshotPreview) {
          URL.revokeObjectURL(screenshotPreview);
        }
        setScreenshotBlob(blob);
        setScreenshotPreview(URL.createObjectURL(blob));
      } else {
        setError("Screenshot captured but failed to convert. Try again.");
      }
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      restoreVisibility();
      // Provide a more helpful message
      setError("Screenshot capture is not available. You can still submit the ticket without one.");
    } finally {
      setIsCapturing(false);
    }
  };

  const removeScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotBlob(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let screenshotStorageId: Id<"_storage"> | undefined;

      // Upload screenshot if present
      if (screenshotBlob) {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: screenshotBlob,
        });
        const result = await uploadResponse.json();
        screenshotStorageId = result.storageId as Id<"_storage">;
      }

      // Create the ticket
      const { ticketNumber } = await createTicket({
        userId: user.id as Id<"users">,
        subject: subject.trim(),
        description: description.trim(),
        severity,
        category,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        browserInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        screenshotStorageId,
      });

      setSuccessTicketNumber(ticketNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if no authenticated user
  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        id="support-trigger-button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setSuccessTicketNumber(null);
            setError("");
          }
        }}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        aria-label="Open support ticket form"
      >
        <LifeBuoy className="w-6 h-6" aria-hidden="true" />
        {openTicketCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            aria-label={`${openTicketCount} open ticket${openTicketCount !== 1 ? "s" : ""}`}
          >
            {openTicketCount > 9 ? "9+" : openTicketCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-50
          transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Submit a support ticket"
        className={`
          fixed bottom-0 right-0 z-50
          w-full md:w-[480px] md:max-w-lg md:right-8 md:bottom-8 md:rounded-xl
          bg-gray-800 border border-gray-700 shadow-2xl
          rounded-t-xl md:rounded-xl
          transition-all duration-300 ease-out
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-full md:translate-y-8 opacity-0 pointer-events-none"}
        `}
        style={{ maxHeight: "85vh" }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-teal-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">Submit Support Ticket</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Close support panel"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Panel content */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(85vh - 65px)" }}>
          {/* Success state */}
          {successTicketNumber ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" aria-hidden="true" />
              <h3 className="text-xl font-semibold text-white mb-2">Ticket Submitted</h3>
              <p className="text-gray-400 mb-1">Your ticket number is:</p>
              <p className="text-2xl font-bold text-teal-400">{successTicketNumber}</p>
              <p className="text-sm text-gray-400 mt-4">
                We will respond as soon as possible. This panel will close automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-600 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Subject */}
              <div>
                <label htmlFor="support-subject" className="block text-sm font-medium text-gray-300 mb-1">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  id="support-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="support-description" className="block text-sm font-medium text-gray-300 mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="support-description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Please describe what happened, what you expected, and any steps to reproduce..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-colors resize-none"
                />
              </div>

              {/* Severity and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="support-severity" className="block text-sm font-medium text-gray-300 mb-1">
                    Severity
                  </label>
                  <select
                    id="support-severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-colors"
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="support-category" className="block text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="support-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-colors"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Screenshot (optional)
                </label>
                {screenshotPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-600">
                    <img
                      src={screenshotPreview}
                      alt="Captured screenshot of current page"
                      className="w-full h-auto max-h-48 object-contain bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      aria-label="Remove screenshot"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    disabled={isCapturing}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:opacity-50 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Camera className="w-4 h-4" aria-hidden="true" />
                    )}
                    {isCapturing ? "Capturing..." : "Capture Screenshot"}
                  </button>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Captures the current page to help our team understand your issue.
                </p>
              </div>

              {/* Context info */}
              <div className="pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400">
                  The current page URL and browser information will be automatically included with your ticket.
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Ticket"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
