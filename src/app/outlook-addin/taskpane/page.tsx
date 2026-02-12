"use client";

import { useState, useEffect, useCallback } from "react";

// Types
interface EmailData {
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  date: string;
}

interface LookupItem {
  id: string;
  firstName?: string;
  lastName?: string;
  ndisNumber?: string;
  propertyName?: string | null;
  address?: string;
}

interface ThreadItem {
  threadId: string;
  subject: string | null;
  participantNames: string[];
  lastActivityAt: number;
  messageCount: number;
}

// Office.js global types (loaded via CDN)
declare const Office: {
  onReady: (callback: (info: { host: string }) => void) => void;
  context: {
    mailbox: {
      item: {
        from: { displayName: string; emailAddress: string };
        to: Array<{ displayName: string; emailAddress: string }>;
        subject: string;
        dateTimeCreated: Date;
        body: {
          getAsync: (
            type: string,
            callback: (result: { status: string; value: string }) => void
          ) => void;
        };
      };
    };
  };
  CoercionType: { Text: string };
};

const API_BASE = "/api/v1";
const CONTACT_TYPES = [
  { value: "support_coordinator", label: "Support Coordinator" },
  { value: "family", label: "Family Member" },
  { value: "participant", label: "Participant" },
  { value: "sil_provider", label: "SIL Provider" },
  { value: "plan_manager", label: "Plan Manager" },
  { value: "ndia", label: "NDIA" },
  { value: "ot", label: "Occupational Therapist" },
  { value: "contractor", label: "Contractor" },
  { value: "other", label: "Other" },
];

export default function OutlookTaskPane() {
  // API key (persisted in localStorage)
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);

  // Email data from Office.js
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [officeReady, setOfficeReady] = useState(false);
  const [officeError, setOfficeError] = useState("");

  // Form fields
  const [direction, setDirection] = useState<"received" | "sent">("received");
  const [contactType, setContactType] = useState("support_coordinator");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [commDate, setCommDate] = useState("");

  // Optional linking
  const [participants, setParticipants] = useState<LookupItem[]>([]);
  const [properties, setProperties] = useState<LookupItem[]>([]);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedThread, setSelectedThread] = useState("");
  const [showThreads, setShowThreads] = useState(false);

  // Status
  const [isPushing, setIsPushing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");

  // Load API key from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("msd_outlook_api_key");
    if (stored) {
      setApiKey(stored);
      setIsKeyConfigured(true);
    }
  }, []);

  // Initialize Office.js
  useEffect(() => {
    if (typeof Office !== "undefined") {
      Office.onReady((info) => {
        if (info.host) {
          setOfficeReady(true);
          readEmail();
        }
      });
    } else {
      // Running outside Outlook (browser preview)
      setOfficeError("Running outside Outlook. Enter email data manually.");
      setCommDate(new Date().toISOString().split("T")[0]);
    }
  }, []);

  // Read email from Office.js
  const readEmail = useCallback(() => {
    try {
      const item = Office.context.mailbox.item;
      const from = item.from;
      const to = item.to?.[0];
      const emailSubject = item.subject;
      const created = item.dateTimeCreated;

      item.body.getAsync(Office.CoercionType.Text, (result) => {
        const body = result.status === "succeeded" ? result.value : "";
        const data: EmailData = {
          from: from?.displayName || "",
          fromEmail: from?.emailAddress || "",
          to: to?.displayName || "",
          toEmail: to?.emailAddress || "",
          subject: emailSubject || "",
          body: body.substring(0, 10000),
          date: created
            ? new Date(created).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        };
        setEmailData(data);

        // Auto-fill form
        setDirection("received");
        setContactName(data.from);
        setContactEmail(data.fromEmail);
        setSubject(data.subject);
        setSummary(data.body);
        setCommDate(data.date);
      });
    } catch (err) {
      setOfficeError("Failed to read email data");
      console.error(err);
    }
  }, []);

  // Toggle direction (switch contact between from/to)
  const handleDirectionChange = (newDirection: "received" | "sent") => {
    setDirection(newDirection);
    if (emailData) {
      if (newDirection === "received") {
        setContactName(emailData.from);
        setContactEmail(emailData.fromEmail);
      } else {
        setContactName(emailData.to);
        setContactEmail(emailData.toEmail);
      }
    }
  };

  // Fetch helpers
  const fetchWithKey = useCallback(
    async (url: string) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    [apiKey]
  );

  // Load lookups when API key is configured
  useEffect(() => {
    if (!isKeyConfigured || !apiKey) return;

    const loadLookups = async () => {
      try {
        const [pRes, prRes] = await Promise.all([
          fetchWithKey(`${API_BASE}/lookup?type=participants&limit=50`),
          fetchWithKey(`${API_BASE}/lookup?type=properties&limit=50`),
        ]);
        setParticipants(pRes.data || []);
        setProperties(prRes.data || []);
      } catch {
        // Silently fail - dropdowns just won't populate
      }
    };
    loadLookups();
  }, [isKeyConfigured, apiKey, fetchWithKey]);

  // Load threads when toggled
  useEffect(() => {
    if (!showThreads || !isKeyConfigured || !apiKey) return;

    const loadThreads = async () => {
      try {
        const url = contactName
          ? `${API_BASE}/communications/threads?contactName=${encodeURIComponent(contactName)}&limit=10`
          : `${API_BASE}/communications/threads?limit=10`;
        const res = await fetchWithKey(url);
        setThreads(res.data || []);
      } catch {
        // Silently fail
      }
    };
    loadThreads();
  }, [showThreads, isKeyConfigured, apiKey, contactName, fetchWithKey]);

  // Save API key
  const handleSaveKey = () => {
    if (!apiKeyInput.startsWith("msd_live_")) {
      setStatusMessage("Invalid key format. Must start with msd_live_");
      setStatusType("error");
      return;
    }
    localStorage.setItem("msd_outlook_api_key", apiKeyInput);
    setApiKey(apiKeyInput);
    setIsKeyConfigured(true);
    setStatusMessage("");
  };

  // Push to communications
  const handlePush = async () => {
    if (!contactName || !summary || !commDate) {
      setStatusMessage("Contact name, summary, and date are required");
      setStatusType("error");
      return;
    }

    setIsPushing(true);
    setStatusMessage("");

    try {
      const payload: Record<string, unknown> = {
        direction,
        contactName,
        contactEmail: contactEmail || undefined,
        contactType,
        subject: subject || undefined,
        summary,
        communicationDate: commDate,
        communicationType: "email",
      };

      if (selectedParticipant) {
        payload.linkedParticipantId = selectedParticipant;
      }
      if (selectedProperty) {
        payload.linkedPropertyId = selectedProperty;
      }
      if (selectedThread) {
        payload.existingThreadId = selectedThread;
      }

      const res = await fetch(`${API_BASE}/communications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to push");
      }

      setStatusMessage("Email pushed to Communications!");
      setStatusType("success");
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to push email"
      );
      setStatusType("error");
    } finally {
      setIsPushing(false);
    }
  };

  // Clear key
  const handleClearKey = () => {
    localStorage.removeItem("msd_outlook_api_key");
    setApiKey("");
    setApiKeyInput("");
    setIsKeyConfigured(false);
  };

  const inputClass =
    "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";
  const selectClass =
    "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-600";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-[400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
        <svg
          className="w-6 h-6 text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
        <div>
          <h1 className="text-sm font-bold text-white">MySDAManager</h1>
          <p className="text-xs text-gray-400">Push to Communications</p>
        </div>
      </div>

      {/* Office.js error banner */}
      {officeError && (
        <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-2 mb-3 text-xs text-yellow-300">
          {officeError}
        </div>
      )}

      {/* API Key Setup */}
      {!isKeyConfigured ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Enter your MySDAManager API key to get started. You can create one
            in Settings &gt; API Keys.
          </p>
          <div>
            <label className={labelClass}>API Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="msd_live_..."
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <button
            onClick={handleSaveKey}
            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save API Key
          </button>
          {statusMessage && statusType === "error" && (
            <p className="text-xs text-red-400">{statusMessage}</p>
          )}
        </div>
      ) : (
        /* Main Form */
        <div className="space-y-3">
          {/* Direction */}
          <div>
            <label className={labelClass}>Direction</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDirectionChange("received")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  direction === "received"
                    ? "bg-teal-600/20 border-teal-600 text-teal-400"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Received
              </button>
              <button
                onClick={() => handleDirectionChange("sent")}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  direction === "sent"
                    ? "bg-teal-600/20 border-teal-600 text-teal-400"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Sent
              </button>
            </div>
          </div>

          {/* Contact Name */}
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className={inputClass}
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className={labelClass}>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
              className={inputClass}
            />
          </div>

          {/* Contact Type */}
          <div>
            <label className={labelClass}>Contact Type</label>
            <select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              className={selectClass}
            >
              {CONTACT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className={labelClass}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className={inputClass}
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={commDate}
              onChange={(e) => setCommDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Summary / Body */}
          <div>
            <label className={labelClass}>
              Email Body / Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              className={`${inputClass} resize-y`}
              placeholder="Email content..."
            />
          </div>

          {/* Divider - Optional Linking */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Link to (optional)
            </p>

            {/* Participant */}
            <div className="mb-2">
              <label className={labelClass}>Participant</label>
              <select
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className={selectClass}
              >
                <option value="">-- None --</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.ndisNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Property */}
            <div className="mb-2">
              <label className={labelClass}>Property</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className={selectClass}
              >
                <option value="">-- None --</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.propertyName || p.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Thread toggle */}
            <div className="mb-2">
              <button
                onClick={() => setShowThreads(!showThreads)}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                {showThreads
                  ? "Hide thread options"
                  : "Add to existing thread..."}
              </button>
              {showThreads && (
                <div className="mt-2">
                  <select
                    value={selectedThread}
                    onChange={(e) => setSelectedThread(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">-- New thread (auto) --</option>
                    {threads.map((t) => (
                      <option key={t.threadId} value={t.threadId}>
                        {t.subject || t.participantNames.join(", ")} (
                        {t.messageCount} msgs)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Push Button */}
          <button
            onClick={handlePush}
            disabled={isPushing || !contactName || !summary || !commDate}
            className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isPushing ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Pushing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
                Push to Comms
              </>
            )}
          </button>

          {/* Status message */}
          {statusMessage && (
            <div
              className={`rounded-lg p-2 text-xs ${
                statusType === "success"
                  ? "bg-green-900/30 border border-green-600/30 text-green-300"
                  : "bg-red-900/30 border border-red-600/30 text-red-300"
              }`}
            >
              {statusMessage}
            </div>
          )}

          {/* Key management */}
          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={handleClearKey}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Change API Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
