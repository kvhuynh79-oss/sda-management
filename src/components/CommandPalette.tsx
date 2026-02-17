"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Building2,
  Users,
  DoorOpen,
  HardHat,
  ClipboardCheck,
  CalendarClock,
  CreditCard,
  BarChart3,
  AlertTriangle,
  FileText,
  Award,
  MessageCircleWarning,
  UserCog,
  HeartHandshake,
  Stethoscope,
  MessagesSquare,
  ListChecks,
  Home,
  Settings,
  CornerDownLeft,
  Clock,
  Plus,
  Bell,
  Sparkles,
  Shield,
  Key,
  Building,
  Link2,
  Rocket,
  ScrollText,
  UserCheck,
  Flame,
  LifeBuoy,
  BookOpen,
  CalendarDays,
  HelpCircle,
  Bug,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  href: string;
  group: "Recent" | "Actions" | "Pages";
  category: string;
  icon: React.ReactNode;
  keywords: string[];
  superAdminOnly?: boolean;
}

// ── Page commands ─────────────────────────────────────────────────

const PAGE_COMMANDS: CommandItem[] = [
  // General
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    group: "Pages",
    category: "General",
    icon: <Home className="w-4 h-4" aria-hidden="true" />,
    keywords: ["home", "overview", "main"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    group: "Pages",
    category: "General",
    icon: <Settings className="w-4 h-4" aria-hidden="true" />,
    keywords: ["preferences", "config", "account", "profile"],
  },
  {
    id: "settings-security",
    label: "Security Settings",
    href: "/settings/security",
    group: "Pages",
    category: "General",
    icon: <Shield className="w-4 h-4" aria-hidden="true" />,
    keywords: ["mfa", "password", "2fa", "lock", "push notifications"],
  },
  {
    id: "settings-organization",
    label: "Organization Settings",
    href: "/settings/organization",
    group: "Pages",
    category: "General",
    icon: <Building className="w-4 h-4" aria-hidden="true" />,
    keywords: ["branding", "logo", "colors", "org", "company"],
  },
  {
    id: "settings-api-keys",
    label: "API Keys",
    href: "/settings/api-keys",
    group: "Pages",
    category: "General",
    icon: <Key className="w-4 h-4" aria-hidden="true" />,
    keywords: ["api", "key", "token", "integration", "rest"],
    superAdminOnly: true,
  },
  {
    id: "settings-xero",
    label: "Xero Integration",
    href: "/settings/integrations/xero",
    group: "Pages",
    category: "General",
    icon: <Link2 className="w-4 h-4" aria-hidden="true" />,
    keywords: ["xero", "accounting", "sync", "integration"],
  },
  {
    id: "settings-calendar",
    label: "Calendar Integration",
    href: "/settings/integrations/calendar",
    group: "Pages",
    category: "General",
    icon: <CalendarDays className="w-4 h-4" aria-hidden="true" />,
    keywords: ["google", "outlook", "calendar", "sync", "integration", "oauth"],
  },
  {
    id: "alerts",
    label: "Alerts",
    href: "/alerts",
    group: "Pages",
    category: "General",
    icon: <Bell className="w-4 h-4" aria-hidden="true" />,
    keywords: ["notification", "warning", "expiry", "overdue"],
  },

  // Portfolio
  {
    id: "properties",
    label: "Properties",
    href: "/properties",
    group: "Pages",
    category: "Portfolio",
    icon: <Building2 className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sda", "dwelling", "building", "address"],
  },
  {
    id: "participants",
    label: "Participants",
    href: "/participants",
    group: "Pages",
    category: "Portfolio",
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    keywords: ["ndis", "tenant", "resident", "person", "client"],
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/onboarding",
    group: "Pages",
    category: "Portfolio",
    icon: <DoorOpen className="w-4 h-4" aria-hidden="true" />,
    keywords: ["intake", "new participant", "move in", "mta"],
  },

  // Operations
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/operations",
    group: "Pages",
    category: "Operations",
    icon: <HardHat className="w-4 h-4" aria-hidden="true" />,
    keywords: ["repair", "fix", "request", "work order", "reactive"],
  },
  {
    id: "inspections",
    label: "Inspections",
    href: "/inspections",
    group: "Pages",
    category: "Operations",
    icon: <ClipboardCheck className="w-4 h-4" aria-hidden="true" />,
    keywords: ["checklist", "audit", "check", "walkthrough"],
  },
  {
    id: "preventative-schedule",
    label: "Preventative Schedule",
    href: "/preventative-schedule",
    group: "Pages",
    category: "Operations",
    icon: <CalendarClock className="w-4 h-4" aria-hidden="true" />,
    keywords: ["scheduled", "planned", "recurring"],
  },
  {
    id: "calendar",
    label: "Compliance Watchdog",
    href: "/calendar",
    group: "Pages",
    category: "Operations",
    icon: <CalendarDays className="w-4 h-4" aria-hidden="true" />,
    keywords: ["watchdog", "compliance", "alerts", "deadlines", "schedule", "events", "month", "week", "day", "agenda", "calendar"],
  },

  // Finance
  {
    id: "payments",
    label: "Payments",
    href: "/financials",
    group: "Pages",
    category: "Finance",
    icon: <CreditCard className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sda", "ndis", "invoice", "billing", "money", "financial"],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/reports",
    group: "Pages",
    category: "Finance",
    icon: <BarChart3 className="w-4 h-4" aria-hidden="true" />,
    keywords: ["analytics", "summary", "export", "folio"],
  },

  // Compliance
  {
    id: "incidents",
    label: "Incidents",
    href: "/incidents",
    group: "Pages",
    category: "Compliance",
    icon: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["report", "ndis", "notification", "accident", "injury"],
  },
  {
    id: "documents",
    label: "Evidence Vault",
    href: "/documents",
    group: "Pages",
    category: "Compliance",
    icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    keywords: ["evidence", "vault", "upload", "file", "pdf", "expiry", "certificate", "documents"],
  },
  {
    id: "certifications",
    label: "Certifications",
    href: "/compliance/certifications",
    group: "Pages",
    category: "Compliance",
    icon: <Award className="w-4 h-4" aria-hidden="true" />,
    keywords: ["compliance", "audit", "registration", "standard"],
  },
  {
    id: "complaints",
    label: "Complaints",
    href: "/compliance/complaints",
    group: "Pages",
    category: "Compliance",
    icon: <MessageCircleWarning className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sop", "procedure", "grievance", "feedback"],
  },
  {
    id: "staff-files",
    label: "Staff Files",
    href: "/compliance/staff",
    group: "Pages",
    category: "Compliance",
    icon: <UserCheck className="w-4 h-4" aria-hidden="true" />,
    keywords: ["employee", "screening", "ndis worker", "staff"],
  },
  {
    id: "policies",
    label: "Policies & Procedures",
    href: "/compliance/policies",
    group: "Pages",
    category: "Compliance",
    icon: <BookOpen className="w-4 h-4" aria-hidden="true" />,
    keywords: ["policy", "procedure", "sop", "compliance", "document"],
  },
  {
    id: "emergency-plans",
    label: "Emergency Plans",
    href: "/compliance/emergency-plans",
    group: "Pages",
    category: "Compliance",
    icon: <Flame className="w-4 h-4" aria-hidden="true" />,
    keywords: ["emergency", "emp", "fire", "evacuation"],
  },
  {
    id: "business-continuity",
    label: "Business Continuity",
    href: "/compliance/business-continuity",
    group: "Pages",
    category: "Compliance",
    icon: <LifeBuoy className="w-4 h-4" aria-hidden="true" />,
    keywords: ["bcp", "continuity", "disaster", "recovery"],
  },

  // Database
  {
    id: "contractors",
    label: "Contractors",
    href: "/database",
    group: "Pages",
    category: "Database",
    icon: <UserCog className="w-4 h-4" aria-hidden="true" />,
    keywords: ["trade", "plumber", "electrician", "supplier"],
  },
  {
    id: "support-coordinators",
    label: "Support Coordinators",
    href: "/database/support-coordinators",
    group: "Pages",
    category: "Database",
    icon: <HeartHandshake className="w-4 h-4" aria-hidden="true" />,
    keywords: ["sc", "ndis", "coordinator"],
  },
  {
    id: "sil-providers",
    label: "SIL Providers",
    href: "/database/sil-providers",
    group: "Pages",
    category: "Database",
    icon: <Home className="w-4 h-4" aria-hidden="true" />,
    keywords: ["supported independent living", "provider"],
  },
  {
    id: "occupational-therapists",
    label: "Occupational Therapists",
    href: "/database/occupational-therapists",
    group: "Pages",
    category: "Database",
    icon: <Stethoscope className="w-4 h-4" aria-hidden="true" />,
    keywords: ["ot", "assessment", "ahpra", "therapist"],
  },

  // Communications
  {
    id: "communications",
    label: "Communications",
    href: "/communications",
    group: "Pages",
    category: "Communications",
    icon: <MessagesSquare className="w-4 h-4" aria-hidden="true" />,
    keywords: ["email", "sms", "call", "message", "thread"],
  },
  {
    id: "follow-ups",
    label: "Follow-ups",
    href: "/follow-ups",
    group: "Pages",
    category: "Communications",
    icon: <ListChecks className="w-4 h-4" aria-hidden="true" />,
    keywords: ["task", "todo", "reminder", "action"],
  },

  // Admin
  {
    id: "admin-ai",
    label: "AI Assistant",
    href: "/admin/ai",
    group: "Pages",
    category: "Admin",
    icon: <Sparkles className="w-4 h-4" aria-hidden="true" />,
    keywords: ["ai", "claude", "analyse", "analyze", "document", "assistant"],
  },
  {
    id: "admin-platform",
    label: "Super Admin Dashboard",
    href: "/admin/platform",
    group: "Pages",
    category: "Admin",
    icon: <Shield className="w-4 h-4" aria-hidden="true" />,
    keywords: ["admin", "platform", "organizations", "super", "impersonate"],
    superAdminOnly: true,
  },
  {
    id: "admin-audit",
    label: "Audit Log",
    href: "/admin/audit",
    group: "Pages",
    category: "Admin",
    icon: <ScrollText className="w-4 h-4" aria-hidden="true" />,
    keywords: ["audit", "log", "trail", "history", "changes"],
  },
  {
    id: "admin-launch",
    label: "Launch Checklist",
    href: "/admin/launch",
    group: "Pages",
    category: "Admin",
    icon: <Rocket className="w-4 h-4" aria-hidden="true" />,
    keywords: ["launch", "checklist", "go live", "setup"],
  },

  // Help
  {
    id: "help-center",
    label: "Help Center",
    href: "/help",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "support", "faq", "how to", "docs"],
  },
  {
    id: "help-dashboard",
    label: "Help: Dashboard",
    href: "/dashboard?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "dashboard", "overview", "getting started"],
  },
  {
    id: "help-properties",
    label: "Help: Properties",
    href: "/properties?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "properties", "sda", "dwelling"],
  },
  {
    id: "help-participants",
    label: "Help: Participants",
    href: "/participants?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "participants", "ndis", "tenant"],
  },
  {
    id: "help-maintenance",
    label: "Help: Maintenance",
    href: "/operations?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "maintenance", "repair", "work order"],
  },
  {
    id: "help-inspections",
    label: "Help: Inspections",
    href: "/inspections?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "inspections", "checklist", "audit"],
  },
  {
    id: "help-incidents",
    label: "Help: Incidents",
    href: "/incidents?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "incidents", "ndis", "report"],
  },
  {
    id: "help-contractors",
    label: "Help: Contractors",
    href: "/database?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "contractors", "trades", "quotes"],
  },
  {
    id: "help-financials",
    label: "Help: Payments & Financials",
    href: "/financials?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "payments", "financials", "mta", "claims", "invoice"],
  },
  {
    id: "help-communications",
    label: "Help: Communications & Follow-ups",
    href: "/follow-ups?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "communications", "follow-ups", "tasks", "email"],
  },
  {
    id: "help-complaints",
    label: "Help: Complaints",
    href: "/compliance/complaints?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "complaints", "sop", "grievance"],
  },
  {
    id: "help-certifications",
    label: "Help: Certifications",
    href: "/compliance/certifications?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "certifications", "compliance", "expiry"],
  },
  {
    id: "help-documents",
    label: "Help: Evidence Vault",
    href: "/documents?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "documents", "evidence", "upload"],
  },
  {
    id: "help-settings",
    label: "Help: Settings",
    href: "/settings?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "settings", "configuration", "api", "webhooks"],
  },
  {
    id: "help-calendar",
    label: "Help: Calendar",
    href: "/calendar?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "calendar", "google", "outlook", "sync"],
  },
  {
    id: "help-alerts",
    label: "Help: Alerts",
    href: "/alerts?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "alerts", "notifications", "expiry"],
  },
  {
    id: "help-reports",
    label: "Help: Reports",
    href: "/reports?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "reports", "analytics", "export", "audit pack"],
  },
  {
    id: "help-staff",
    label: "Help: Staff Files",
    href: "/compliance/staff?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "staff", "screening", "ndis worker"],
  },
  {
    id: "help-emergency",
    label: "Help: Emergency Plans",
    href: "/emergency-plans?showHelp=true",
    group: "Pages",
    category: "Help",
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    keywords: ["help", "guide", "emergency", "bcp", "evacuation"],
  },
  {
    id: "report-issue",
    label: "Report an Issue",
    href: "/support",
    group: "Pages",
    category: "Help",
    icon: <Bug className="w-4 h-4" aria-hidden="true" />,
    keywords: ["bug", "issue", "problem", "error", "support", "contact"],
  },
];

// ── Action commands ───────────────────────────────────────────────

const ACTION_COMMANDS: CommandItem[] = [
  {
    id: "action-new-property",
    label: "New Property",
    href: "/properties/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "property", "dwelling"],
  },
  {
    id: "action-new-participant",
    label: "New Participant",
    href: "/participants/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "participant", "ndis", "tenant"],
  },
  {
    id: "action-new-maintenance",
    label: "New Maintenance Request",
    href: "/maintenance/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "maintenance", "repair", "fix", "request"],
  },
  {
    id: "action-new-incident",
    label: "New Incident",
    href: "/incidents/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "incident", "report", "accident"],
  },
  {
    id: "action-new-inspection",
    label: "New Inspection",
    href: "/inspections/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "inspection", "checklist"],
  },
  {
    id: "action-new-document",
    label: "Upload Document",
    href: "/documents/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "upload", "document", "file"],
  },
  {
    id: "action-new-payment",
    label: "New Payment",
    href: "/payments/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "payment", "sda", "invoice"],
  },
  {
    id: "action-new-communication",
    label: "New Communication",
    href: "/follow-ups/communications/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "communication", "email", "call", "sms", "log"],
  },
  {
    id: "action-new-scheduled-task",
    label: "New Preventative Task",
    href: "/preventative-schedule/new",
    group: "Actions",
    category: "Create",
    icon: <Plus className="w-4 h-4" aria-hidden="true" />,
    keywords: ["create", "add", "scheduled", "preventative", "task"],
  },
];

const ALL_COMMANDS: CommandItem[] = [...ACTION_COMMANDS, ...PAGE_COMMANDS];

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
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
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
  // Label contains query as whole word
  if (label.includes(` ${q}`) || label.includes(`${q} `)) return 85;
  // Label contains query
  if (label.includes(q)) return 80;
  // Keyword exact match
  if (item.keywords.some((k) => k === q)) return 70;
  // Keyword starts with query
  if (item.keywords.some((k) => k.startsWith(q))) return 60;
  // Keyword contains query
  if (item.keywords.some((k) => k.includes(q))) return 50;
  // Category match
  if (item.category.toLowerCase().includes(q)) return 40;
  // Fuzzy match on label
  if (fuzzyMatch(q, label)) return 30;
  // Fuzzy match on keywords
  if (item.keywords.some((k) => fuzzyMatch(q, k))) return 20;

  return 0;
}

// ── Highlight matched text ────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <span className="text-teal-400 font-semibold">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

// ── Display section ───────────────────────────────────────────────

type DisplayEntry =
  | { type: "header"; label: string }
  | { type: "item"; item: CommandItem; flatIndex: number };

// ── Command Palette component ─────────────────────────────────────

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check if user is super-admin to filter admin-only commands
  const isSuperAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem("sda_user");
      if (!stored) return false;
      const user = JSON.parse(stored);
      return user.isSuperAdmin === true;
    } catch {
      return false;
    }
  }, []);

  // Filter out super-admin-only commands for non-super-admins
  const visibleCommands = useMemo(() => {
    if (isSuperAdmin) return ALL_COMMANDS;
    return ALL_COMMANDS.filter((cmd) => !cmd.superAdminOnly);
  }, [isSuperAdmin]);

  const visiblePageCommands = useMemo(() => {
    if (isSuperAdmin) return PAGE_COMMANDS;
    return PAGE_COMMANDS.filter((cmd) => !cmd.superAdminOnly);
  }, [isSuperAdmin]);

  // Re-read recent pages each time palette opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentIds = useMemo(() => getRecentPages(), [isOpen]);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return visibleCommands;
    }

    return visibleCommands.map((cmd) => ({
      cmd,
      score: matchScore(query, cmd),
    }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [query, visibleCommands]);

  // Build display list with grouped sections
  const displayItems = useMemo((): DisplayEntry[] => {
    const items: DisplayEntry[] = [];
    let flatIndex = 0;

    if (!query.trim()) {
      // Show recent pages first if any exist
      const recentItems = recentIds
        .map((id) => visibleCommands.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];

      if (recentItems.length > 0) {
        items.push({ type: "header", label: "Recent" });
        for (const item of recentItems) {
          items.push({ type: "item", item, flatIndex });
          flatIndex++;
        }
      }

      // Actions
      items.push({ type: "header", label: "Actions" });
      for (const cmd of ACTION_COMMANDS) {
        items.push({ type: "item", item: cmd, flatIndex });
        flatIndex++;
      }

      // Pages grouped by category
      const categories = new Map<string, CommandItem[]>();
      for (const cmd of visiblePageCommands) {
        const cat = categories.get(cmd.category) || [];
        cat.push(cmd);
        categories.set(cmd.category, cat);
      }
      for (const [catName, catItems] of categories) {
        items.push({ type: "header", label: catName });
        for (const item of catItems) {
          items.push({ type: "item", item, flatIndex });
          flatIndex++;
        }
      }
    } else {
      // Search results, group by group (Actions first, then Pages)
      const actions = filteredCommands.filter((c) => c.group === "Actions");
      const pages = filteredCommands.filter((c) => c.group === "Pages");

      if (actions.length > 0) {
        items.push({ type: "header", label: "Actions" });
        for (const cmd of actions) {
          items.push({ type: "item", item: cmd, flatIndex });
          flatIndex++;
        }
      }

      if (pages.length > 0) {
        // Group pages by category
        const categories = new Map<string, CommandItem[]>();
        for (const cmd of pages) {
          const cat = categories.get(cmd.category) || [];
          cat.push(cmd);
          categories.set(cmd.category, cat);
        }
        for (const [catName, catItems] of categories) {
          items.push({ type: "header", label: catName });
          for (const item of catItems) {
            items.push({ type: "item", item, flatIndex });
            flatIndex++;
          }
        }
      }
    }

    return items;
  }, [query, filteredCommands, recentIds, visibleCommands, visiblePageCommands]);

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

  // Keyboard shortcut to open (Ctrl+K / Cmd+K / forward-slash / Escape to close)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }

      // Ctrl+K / Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
        return;
      }

      // Forward slash when not focused on an input
      if (
        e.key === "/" &&
        !isOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        open();
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
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus trap: keep focus inside the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;

      const firstEl = focusableElements[0];
      const lastEl = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
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
        setSelectedIndex((prev) =>
          prev < selectableCount - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : selectableCount - 1
        );
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

  // Derive the active descendant id for aria
  const activeDescendantId = `cmd-item-${selectedIndex}`;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-150"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette dialog */}
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4"
        onKeyDown={handleKeyDown}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="w-full max-w-xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-700">
            <Search
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search pages and actions..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm py-4 outline-none"
              aria-label="Search pages and actions"
              aria-controls="cmd-palette-list"
              aria-activedescendant={
                selectableCount > 0 ? activeDescendantId : undefined
              }
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
                className="p-1 text-gray-400 hover:text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
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
            id="cmd-palette-list"
            className="max-h-[50vh] overflow-y-auto py-2 scroll-smooth"
            role="listbox"
            aria-label="Search results"
          >
            {selectableCount === 0 ? (
              <div className="px-4 py-10 text-center">
                <Search
                  className="w-8 h-8 text-gray-600 mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-gray-400 text-sm">
                  No results for &quot;{query}&quot;
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              displayItems.map((entry, i) => {
                if (entry.type === "header") {
                  return (
                    <div
                      key={`header-${entry.label}-${i}`}
                      className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                      aria-hidden="true"
                    >
                      {entry.label}
                    </div>
                  );
                }

                const isSelected = entry.flatIndex === selectedIndex;
                const isRecent =
                  !query.trim() &&
                  recentIds.includes(entry.item.id) &&
                  entry.flatIndex < recentIds.length;

                return (
                  <button
                    key={`${entry.item.id}-${entry.flatIndex}`}
                    id={`cmd-item-${entry.flatIndex}`}
                    data-index={entry.flatIndex}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => navigateTo(entry.item)}
                    onMouseEnter={() => setSelectedIndex(entry.flatIndex)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors duration-75
                      focus:outline-none
                      ${
                        isSelected
                          ? "bg-teal-600/15 text-white"
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
                      {highlightMatch(entry.item.label, query)}
                    </span>
                    {entry.item.group === "Actions" && (
                      <span className="text-[10px] text-teal-500 bg-teal-500/10 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                        Action
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 flex-shrink-0 hidden sm:inline">
                      {entry.item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft
                        className="w-3.5 h-3.5 text-teal-500 flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-700 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-gray-700 text-gray-400 px-1 py-0.5 rounded font-mono text-[10px]">
                &uarr;&darr;
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-gray-700 text-gray-400 px-1 py-0.5 rounded font-mono text-[10px]">
                Enter
              </kbd>
              Open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-gray-700 text-gray-400 px-1 py-0.5 rounded font-mono text-[10px]">
                Esc
              </kbd>
              Close
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <kbd className="bg-gray-700 text-gray-400 px-1 py-0.5 rounded font-mono text-[10px]">
                Ctrl K
              </kbd>
              Toggle
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
