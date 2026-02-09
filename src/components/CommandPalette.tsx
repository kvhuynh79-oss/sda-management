"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Building2,
  Users,
  DoorOpen,
  Wrench,
  HardHat,
  ClipboardCheck,
  CalendarClock,
  CreditCard,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Award,
  MessageCircleWarning,
  Database,
  UserCog,
  HeartHandshake,
  Stethoscope,
  MessageSquareMore,
  MessagesSquare,
  ListChecks,
  Home,
  Settings,
  CornerDownLeft,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  href: string;
  group: string;
  icon: React.ReactNode;
  keywords: string[];
}

// ── All navigable pages ───────────────────────────────────────────

const ALL_COMMANDS: CommandItem[] = [
  // Dashboard
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    group: "General",
    icon: <Home className="w-4 h-4" aria-hidden="true" />,
    keywords: ["home", "overview", "main"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    group: "General",
    icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    keywords: ["preferences", "config", "account", "profile"],
  },
  // Portfolio
  {
    id: "properties",
    label: "Properties",
    href: "/properties",
    group: "Portfolio",
    icon: <Building2 className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sda", "dwelling", "building", "address"],
  },
  {
    id: "participants",
    label: "Participants",
    href: "/participants",
    group: "Portfolio",
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    keywords: ["ndis", "tenant", "resident", "person", "client"],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/onboarding",
    group: "Portfolio",
    icon: <DoorOpen className="w-4 h-4" aria-hidden="true" />,
    keywords: ["intake", "new participant", "move in"],
  },
  // Operations
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/operations",
    group: "Operations",
    icon: <HardHat className="w-4 h-4" aria-hidden="true" />,
    keywords: ["repair", "fix", "request", "work order", "reactive"],
  },
  {
    id: "inspections",
    label: "Inspections",
    href: "/inspections",
    group: "Operations",
    icon: <ClipboardCheck className="w-4 h-4" aria-hidden="true" />,
    keywords: ["checklist", "audit", "check", "walkthrough"],
  },
  {
    id: "preventative-schedule",
    label: "Preventative Schedule",
    href: "/preventative-schedule",
    group: "Operations",
    icon: <CalendarClock className="w-4 h-4" aria-hidden="true" />,
    keywords: ["scheduled", "planned", "recurring", "calendar"],
  },
  // Finance
  {
    id: "payments",
    label: "Payments",
    href: "/financials",
    group: "Finance",
    icon: <CreditCard className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sda", "ndis", "invoice", "billing", "money", "financial"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    group: "Finance",
    icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
    keywords: ["analytics", "summary", "export", "folio"],
  },
  // Compliance
  {
    id: "incidents",
    label: "Incidents",
    href: "/incidents",
    group: "Compliance",
    icon: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["report", "ndis", "notification", "accident", "injury"],
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    group: "Compliance",
    icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    keywords: ["upload", "file", "pdf", "expiry", "certificate"],
  },
  {
    id: "certifications",
    label: "Certifications",
    href: "/compliance/certifications",
    group: "Compliance",
    icon: <Award className="w-4 h-4" aria-hidden="true" />,
    keywords: ["compliance", "audit", "registration", "standard"],
  },
  {
    id: "complaints",
    label: "Complaints",
    href: "/compliance/complaints",
    group: "Compliance",
    icon: <MessageCircleWarning className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sop", "procedure", "grievance", "feedback"],
  },
  // Database
  {
    id: "contractors",
    label: "Contractors",
    href: "/database",
    group: "Database",
    icon: <UserCog className="w-4 h-4" aria-hidden="true" />,
    keywords: ["trade", "plumber", "electrician", "supplier"],
  },
  {
    id: "support-coordinators",
    label: "Support Coordinators",
    href: "/database/support-coordinators",
    group: "Database",
    icon: <HeartHandshake className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sc", "ndis", "coordinator"],
  },
  {
    id: "sil-providers",
    label: "SIL Providers",
    href: "/database/sil-providers",
    group: "Database",
    icon: <Home className="w-4 h-4" aria-hidden="true" />,
    keywords: ["supported independent living", "provider"],
  },
  {
    id: "occupational-therapists",
    label: "Occupational Therapists",
    href: "/database/occupational-therapists",
    group: "Database",
    icon: <Stethoscope className="w-4 h-4" aria-hidden="true" />,
    keywords: ["ot", "assessment", "ahpra", "therapist"],
  },
  // Communications
  {
    id: "communications",
    label: "Communications",
    href: "/communications",
    group: "Communications",
    icon: <MessagesSquare className="w-4 h-4" aria-hidden="true" />,
    keywords: ["email", "sms", "call", "message", "thread"],
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    href: "/follow-ups",
    group: "Communications",
    icon: <ListChecks className="w-4 h-4" aria-hidden="true" />,
    keywords: ["task", "todo", "reminder", "action"],
  },
];

// ── Recent pages storage ──────────────────────────────────────────

const RECENT_KEY = "sda_recent_pages";
const MAX_RECENT = 5;

function getRecentPages(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentPage(id: string) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentPages().filter((r) => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore storage errors
  }
}

// ── Fuzzy matching ────────────────────────────────────────────────

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;

  // Check if all characters in query appear in order in target
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function matchScore(query: string, item: CommandItem): number {
  const q = query.toLowerCase();
  const label = item.label.toLowerCase();

  // Exact match on label
  if (label === q) return 100;
  // Label starts with query
  if (label.startsWith(q)) return 90;
  // Label contains query
  if (label.includes(q)) return 80;
  // Keyword exact match
  if (item.keywords.some((k) => k === q)) return 70;
  // Keyword starts with query
  if (item.keywords.some((k) => k.startsWith(q))) return 60;
  // Keyword contains query
  if (item.keywords.some((k) => k.includes(q))) return 50;
  // Fuzzy match on label
  if (fuzzyMatch(q, label)) return 30;
  // Fuzzy match on keywords
  if (item.keywords.some((k) => fuzzyMatch(q, k))) return 20;
  // Group match
  if (item.group.toLowerCase().includes(q)) return 10;

  return 0;
}

// ── Command Palette component ─────────────────────────────────────

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Get recent page items
  const recentIds = useMemo(() => getRecentPages(), [isOpen]);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return ALL_COMMANDS;
    }

    return ALL_COMMANDS.map((item) => ({
      item,
      score: matchScore(query, item),
    }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }, [query]);

  // Build display list: recent section + results grouped by category
  const displayItems = useMemo(() => {
    const items: Array<{ type: "header"; label: string } | { type: "item"; item: CommandItem; flatIndex: number }> = [];
    let flatIndex = 0;

    if (!query.trim()) {
      // Show recent pages first
      const recentItems = recentIds
        .map((id) => ALL_COMMANDS.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];

      if (recentItems.length > 0) {
        items.push({ type: "header", label: "Recent" });
        for (const item of recentItems) {
          items.push({ type: "item", item, flatIndex });
          flatIndex++;
        }
      }

      // Then all items grouped
      const groups = new Map<string, CommandItem[]>();
      for (const cmd of ALL_COMMANDS) {
        const group = groups.get(cmd.group) || [];
        group.push(cmd);
        groups.set(cmd.group, group);
      }

      for (const [groupName, groupItems] of groups) {
        items.push({ type: "header", label: groupName });
        for (const item of groupItems) {
          items.push({ type: "item", item, flatIndex });
          flatIndex++;
        }
      }
    } else {
      // Show search results, grouped
      const groups = new Map<string, CommandItem[]>();
      for (const cmd of filteredCommands) {
        const group = groups.get(cmd.group) || [];
        group.push(cmd);
        groups.set(cmd.group, group);
      }

      for (const [groupName, groupItems] of groups) {
        items.push({ type: "header", label: groupName });
        for (const item of groupItems) {
          items.push({ type: "item", item, flatIndex });
          flatIndex++;
        }
      }
    }

    return items;
  }, [query, filteredCommands, recentIds]);

  // Count total selectable items
  const selectableCount = useMemo(
    () => displayItems.filter((d) => d.type === "item").length,
    [displayItems]
  );

  // Open/close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  // Navigate to selected item
  const navigateTo = useCallback(
    (item: CommandItem) => {
      addRecentPage(item.id);
      close();
      router.push(item.href);
    },
    [close, router]
  );

  // Keyboard shortcut to open (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  // Listen for custom event from Header search button
  useEffect(() => {
    const handler = () => open();
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation within palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < selectableCount - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : selectableCount - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = displayItems.find(
          (d) => d.type === "item" && d.flatIndex === selectedIndex
        );
        if (selected && selected.type === "item") {
          navigateTo(selected.item);
        }
      }
    },
    [close, selectableCount, displayItems, selectedIndex, navigateTo]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Prevent body scroll when open
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
        onKeyDown={handleKeyDown}
      >
        <div className="w-full max-w-lg bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-700">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search pages..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm py-4 outline-none"
              aria-label="Search pages"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded font-mono">
              Esc
            </kbd>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto py-2"
            role="listbox"
            aria-label="Search results"
          >
            {selectableCount === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              displayItems.map((entry, i) => {
                if (entry.type === "header") {
                  return (
                    <div
                      key={`header-${entry.label}-${i}`}
                      className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400"
                      aria-hidden="true"
                    >
                      {entry.label}
                    </div>
                  );
                }

                const isSelected = entry.flatIndex === selectedIndex;
                const isRecent = !query.trim() && recentIds.includes(entry.item.id) && entry.flatIndex < recentIds.length;

                return (
                  <button
                    key={`${entry.item.id}-${entry.flatIndex}`}
                    data-index={entry.flatIndex}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => navigateTo(entry.item)}
                    onMouseEnter={() => setSelectedIndex(entry.flatIndex)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors duration-100
                      ${
                        isSelected
                          ? "bg-teal-600/20 text-white"
                          : "text-gray-300 hover:bg-gray-700/50"
                      }
                    `}
                  >
                    <span
                      className={`flex-shrink-0 ${
                        isSelected ? "text-teal-400" : "text-gray-400"
                      }`}
                    >
                      {isRecent ? (
                        <Clock className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        entry.item.icon
                      )}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {entry.item.label}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {entry.item.group}
                    </span>
                    {isSelected && (
                      <CornerDownLeft
                        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-700 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-700 px-1 py-0.5 rounded font-mono">
                &uarr;&darr;
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-700 px-1 py-0.5 rounded font-mono">
                Enter
              </kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-700 px-1 py-0.5 rounded font-mono">
                Esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
