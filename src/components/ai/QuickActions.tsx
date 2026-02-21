"use client";

import {
  Home,
  Calendar,
  Wrench,
  FileText,
  DollarSign,
  Users,
} from "lucide-react";

interface QuickActionsProps {
  onAction: (query: string) => void;
  disabled?: boolean;
}

const quickActions = [
  {
    label: "Show vacancies",
    query: "Show all vacant rooms and dwellings",
    icon: Home,
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    label: "Expiring plans",
    query: "Which participant plans are expiring in the next 60 days?",
    icon: Calendar,
    color: "bg-orange-600 hover:bg-orange-700",
  },
  {
    label: "Overdue maintenance",
    query: "Show all overdue maintenance requests",
    icon: Wrench,
    color: "bg-red-600 hover:bg-red-700",
  },
  {
    label: "Expiring documents",
    query: "What documents are expiring in the next 30 days?",
    icon: FileText,
    color: "bg-yellow-600 hover:bg-yellow-700",
  },
  {
    label: "Recent payments",
    query: "Show recent payment activity summary",
    icon: DollarSign,
    color: "bg-teal-700 hover:bg-teal-800",
  },
  {
    label: "All participants",
    query: "List all active participants with their locations",
    icon: Users,
    color: "bg-purple-600 hover:bg-purple-700",
  },
];

export default function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400 font-medium">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.query)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
