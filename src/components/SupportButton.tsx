"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LifeBuoy, X, Camera, Loader2, CheckCircle2, ArrowRight, Clock, MessageSquare, Plus, ChevronLeft, BookOpen } from "lucide-react";
import { HELP_GUIDES } from "@/constants/helpGuides";

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

const ROUTE_TO_GUIDE: Record<string, string> = {
  "/properties": "properties",
  "/participants": "participants",
  "/operations": "maintenance",
  "/maintenance": "maintenance",
  "/inspections": "inspections",
  "/incidents": "incidents",
  "/contractors": "contractors",
  "/database": "contractors",
  "/financials": "payments",
  "/payments": "payments",
  "/follow-ups": "communications",
  "/documents": "documents",
  "/compliance/complaints": "complaints",
  "/compliance/certifications": "certifications",
  "/compliance/staff": "staff",
  "/calendar": "calendar",
  "/alerts": "alerts",
  "/reports": "reports",
  "/settings": "settings",
  "/dashboard": "dashboard",
};

const TROUBLESHOOTING_STEPS = [
  { id: "refresh", label: "Refresh the page", description: "Many issues resolve with a simple page refresh." },
  { id: "session", label: "Check your session", description: "Your session may have expired. Try logging out and back in." },
  { id: "cache", label: "Hard refresh (Ctrl+Shift+R)", description: "Clears cached data that may cause display issues." },
  { id: "guide", label: "Read the help guide", description: "Each page has a contextual guide with step-by-step instructions." },
];

type PanelView = "list" | "diagnose" | "form";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-500/20 text-red-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-500/20 text-yellow-400" },
  waiting_on_customer: { label: "Action Needed", color: "bg-blue-500/20 text-blue-400" },
  resolved: { label: "Resolved", color: "bg-green-500/20 text-green-400" },
  closed: { label: "Closed", color: "bg-gray-500/20 text-gray-400" },
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function SupportButton() {
  const user = usePassiveAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>("list");
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
  const [diagnosisChecked, setDiagnosisChecked] = useState<Set<string>>(new Set());

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

  const currentGuide = useMemo(() => {
    if (typeof window === "undefined" || !isOpen) return null;
    const path = window.location.pathname;
    const key = ROUTE_TO_GUIDE[path]
      || Object.entries(ROUTE_TO_GUIDE).find(([route]) => path.startsWith(route + "/"))?.[1];
    return key ? HELP_GUIDES[key] || null : null;
  }, [isOpen]);

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

  // Auto-switch to list after success (longer delay to let user read)
  useEffect(() => {
    if (successTicketNumber) {
      const timer = setTimeout(() => {
        setSuccessTicketNumber(null);
        resetForm();
        setPanelView("list");
      }, 4000);
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
    setDiagnosisChecked(new Set());
  }, [screenshotPreview]);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    setError("");

    // Store refs for restoration
    const panel = panelRef.current;
    const triggerButton = document.getElementById("support-trigger-button");
    const backdrop = panel?.previousElementSibling as HTMLElement | null;

    // Query Tawk.to elements BEFORE defining restoreVisibility (closure scoping)
    const tawkElements = document.querySelectorAll<HTMLElement>(
      '[id^="tawk-"], [class*="tawk-"]'
    );

    const restoreVisibility = () => {
      if (panel) panel.style.display = "";
      if (triggerButton) triggerButton.style.display = "";
      if (backdrop) backdrop.style.display = "";
      tawkElements.forEach((el) => { el.style.display = ""; });
    };

    try {
      // Temporarily hide the support UI so it doesn't appear in the screenshot
      if (panel) panel.style.display = "none";
      if (triggerButton) triggerButton.style.display = "none";
      if (backdrop) backdrop.style.display = "none";
      tawkElements.forEach((el) => { el.style.display = "none"; });

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
        foreignObjectRendering: false,
        removeContainer: true,
        ignoreElements: (el: Element) => {
          if (el.tagName === "IFRAME") return true;
          if (el.tagName === "VIDEO") return true;
          // Skip cross-origin images that could cause issues
          if (el.tagName === "IMG") {
            const src = (el as HTMLImageElement).src || "";
            if (src && !src.startsWith(window.location.origin) && !src.startsWith("data:") && !src.startsWith("blob:")) {
              return true;
            }
          }
          return false;
        },
      });

      restoreVisibility();

      // Try toBlob first; if canvas is tainted, fall back to toDataURL
      let blob: Blob | null = null;
      try {
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/png", 0.85);
        });
      } catch {
        // Canvas is tainted by cross-origin content - convert via dataURL fallback
        try {
          const dataUrl = canvas.toDataURL("image/png");
          const res = await fetch(dataUrl);
          blob = await res.blob();
        } catch {
          // Both methods failed - still continue with null blob
        }
      }

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
      // Show actual error in development, generic message in production
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "development") {
        setError(`Screenshot failed: ${msg}`);
      } else {
        setError("Screenshot capture is not available. You can still submit the ticket without one.");
      }
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
          if (!isOpen) {
            // Open panel: show list if there are tickets, else show diagnosis wizard
            setPanelView(openTicketCount > 0 ? "list" : "diagnose");
            setSuccessTicketNumber(null);
            setError("");
          }
          setIsOpen(!isOpen);
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
        aria-label={panelView === "list" ? "Support tickets" : panelView === "diagnose" ? "Before you submit" : "Submit a support ticket"}
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
            {(panelView === "form" || panelView === "diagnose") && tickets && tickets.length > 0 && !successTicketNumber && (
              <button
                onClick={() => setPanelView(panelView === "form" ? "diagnose" : "list")}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Back to ticket list"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <LifeBuoy className="w-5 h-5 text-teal-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-white">
              {panelView === "list" ? "Support" : panelView === "diagnose" ? "Before You Submit" : "New Ticket"}
            </h2>
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
                We will respond as soon as possible.
              </p>
              <button
                onClick={() => {
                  setSuccessTicketNumber(null);
                  resetForm();
                  setPanelView("list");
                }}
                className="mt-4 text-sm text-teal-400 hover:text-teal-300 transition-colors underline"
              >
                View your tickets
              </button>
            </div>
          ) : panelView === "list" ? (
            /* ── Ticket list view ── */
            <div className="space-y-3">
              {/* New Ticket button */}
              <button
                onClick={() => setPanelView("diagnose")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                New Ticket
              </button>

              {/* Tickets */}
              {!tickets ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3 animate-pulse">
                      <div className="h-4 bg-gray-600 rounded w-20 mb-2" />
                      <div className="h-4 bg-gray-600 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-gray-400">No tickets yet. Create one above!</p>
                </div>
              ) : (
                tickets.map((ticket) => {
                  const st = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
                  const hasNewReply = ticket.status === "waiting_on_customer" ||
                    (ticket.messageCount > 0 && ticket.status !== "closed" && ticket.status !== "resolved");
                  return (
                    <button
                      key={ticket._id}
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/support/${ticket._id}`);
                      }}
                      className="w-full text-left bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-teal-400">{ticket.ticketNumber}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-sm text-white font-medium truncate">{ticket.subject}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 mt-1" aria-hidden="true" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatRelativeTime(ticket.updatedAt)}
                        </span>
                        {ticket.messageCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" aria-hidden="true" />
                            {ticket.messageCount}
                          </span>
                        )}
                        {hasNewReply && (
                          <span className="text-teal-400 font-medium">Reply available</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}

              {/* View all link */}
              {tickets && tickets.length > 0 && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/support");
                  }}
                  className="w-full text-center text-sm text-teal-400 hover:text-teal-300 transition-colors py-2"
                >
                  View all tickets
                </button>
              )}
            </div>
          ) : panelView === "diagnose" ? (
            <div className="space-y-4">
              {/* Contextual help suggestion */}
              {currentGuide && (
                <div className="bg-teal-900/30 border border-teal-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white mb-1">
                        Help available for this page
                      </p>
                      <p className="text-sm text-gray-400 mb-2">
                        {currentGuide.overview.substring(0, 150)}...
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          const path = window.location.pathname;
                          window.location.href = `${path}?showHelp=true`;
                        }}
                        className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
                      >
                        Open Help Guide
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What kind of issue are you experiencing?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                        category === opt.value
                          ? "bg-teal-600/20 border-teal-600 text-teal-400"
                          : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* How-to deflection */}
              {category === "how_to" && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-sm text-yellow-300 mb-2 font-medium">
                    Before submitting, have you checked:
                  </p>
                  <ul className="space-y-1.5">
                    <li>
                      <a href="/help" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
                        Help Center - search all guides
                      </a>
                    </li>
                    {currentGuide && (
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            window.location.href = `${window.location.pathname}?showHelp=true`;
                          }}
                          className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                        >
                          {currentGuide.title}
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Quick troubleshooting checklist */}
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">
                  Quick troubleshooting
                </p>
                <div className="space-y-2">
                  {TROUBLESHOOTING_STEPS.map((step) => (
                    <label
                      key={step.id}
                      className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={diagnosisChecked.has(step.id)}
                        onChange={() => {
                          setDiagnosisChecked((prev) => {
                            const next = new Set(prev);
                            if (next.has(step.id)) next.delete(step.id); else next.add(step.id);
                            return next;
                          });
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-gray-500 bg-gray-600 text-teal-500 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-sm text-white">{step.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setDiagnosisChecked(new Set());
                    setPanelView("form");
                  }}
                  className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  I still need help
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiagnosisChecked(new Set());
                    setCategory("bug");
                    setPanelView("list");
                  }}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
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
