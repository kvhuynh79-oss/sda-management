"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface ThreadPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (threadId: string) => void;
  excludeThreadId?: string;
  userId: string;
}

export default function ThreadPickerModal({
  isOpen,
  onClose,
  onSelect,
  excludeThreadId,
  userId,
}: ThreadPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"threads" | "leads">("threads");

  const results = useQuery(
    api.communications.searchThreadsForPicker,
    isOpen
      ? {
          userId: userId as Id<"users">,
          search: search || undefined,
          excludeThreadId,
          includeLeads: true,
        }
      : "skip"
  );

  if (!isOpen) return null;

  const threads = results?.filter((r) => !r.isLead) || [];
  const leads = results?.filter((r) => r.isLead) || [];
  const displayItems = activeTab === "threads" ? threads : leads;

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const handleSelect = () => {
    if (selectedThreadId) {
      onSelect(selectedThreadId);
      setSelectedThreadId(null);
      setSearch("");
    }
  };

  const handleClose = () => {
    setSelectedThreadId(null);
    setSearch("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Select a thread or lead"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-white mb-3">Link to Thread</h2>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("threads")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === "threads"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Threads ({threads.length})
            </button>
            <button
              onClick={() => setActiveTab("leads")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === "leads"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Leads ({leads.length})
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "threads" ? "Search by subject or contact..." : "Search by participant or referrer..."}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
          {!results ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? "No matches found" : `No ${activeTab} available`}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayItems.map((item) => (
                <button
                  key={item.threadId}
                  onClick={() => setSelectedThreadId(item.threadId)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedThreadId === item.threadId
                      ? "border-teal-500 bg-teal-900/30"
                      : "border-gray-700 bg-gray-900 hover:bg-gray-700/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.isLead && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-900 text-teal-300 shrink-0">
                            Lead
                          </span>
                        )}
                        <p className="text-sm font-medium text-white truncate">
                          {item.subject}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.contactNames.filter(Boolean).join(", ") || "Unknown contact"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(item.lastActivityAt)}</p>
                      {!item.isLead && item.messageCount > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.messageCount} msg{item.messageCount !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedThreadId}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move to {activeTab === "leads" ? "Lead" : "Thread"}
          </button>
        </div>
      </div>
    </div>
  );
}
