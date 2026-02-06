"use client";

import { useState } from "react";
import {
  HelpCircle,
  X,
  Home,
  Users,
  Wrench,
  FileText,
  DollarSign,
  Calendar,
  ClipboardList,
  Building2,
  ArrowRightLeft,
  PlusCircle,
  Shield,
  HardHat,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

interface AIHelpGuideProps {
  onTryPrompt: (prompt: string) => void;
  disabled?: boolean;
}

interface PromptCategory {
  title: string;
  icon: React.ElementType;
  color: string;
  prompts: {
    prompt: string;
    description: string;
  }[];
}

const promptCategories: PromptCategory[] = [
  {
    title: "Vacancies & Properties",
    icon: Home,
    color: "text-green-400",
    prompts: [
      {
        prompt: "Show all vacant rooms and dwellings",
        description: "View all available spaces across properties",
      },
      {
        prompt: "What's the vacancy status at Waldron Road?",
        description: "Check vacancies at a specific property",
      },
      {
        prompt: "Give me a summary of all properties",
        description: "Overview of all property details",
      },
      {
        prompt: "Find HPS vacancies for a new participant",
        description: "Match participant to suitable vacancies by SDA category",
      },
    ],
  },
  {
    title: "Participants",
    icon: Users,
    color: "text-blue-400",
    prompts: [
      {
        prompt: "List all active participants with their locations",
        description: "See all participants and where they live",
      },
      {
        prompt: "Tell me about Daniel Smith",
        description: "Get details about a specific participant",
      },
      {
        prompt: "When does Sarah's NDIS plan expire?",
        description: "Check plan expiry for a participant",
      },
      {
        prompt: "Which participant plans expire in the next 60 days?",
        description: "Find all plans expiring soon",
      },
    ],
  },
  {
    title: "Maintenance",
    icon: Wrench,
    color: "text-red-400",
    prompts: [
      {
        prompt: "Show all overdue maintenance requests",
        description: "View maintenance that needs attention",
      },
      {
        prompt: "What urgent maintenance is pending?",
        description: "Filter by priority level",
      },
      {
        prompt: "Create maintenance request for broken AC at HPS House",
        description: "Log a new maintenance issue",
      },
      {
        prompt: "Mark the leaky tap maintenance as completed",
        description: "Update maintenance status",
      },
    ],
  },
  {
    title: "Payments & Finance",
    icon: DollarSign,
    color: "text-yellow-400",
    prompts: [
      {
        prompt: "Show recent payment activity summary",
        description: "View recent payments across participants",
      },
      {
        prompt: "What's the payment status for Andrew?",
        description: "Check payments for a specific participant",
      },
      {
        prompt: "Record a $5,000 payment for Daniel",
        description: "Add a new payment record",
      },
      {
        prompt: "What payments are due this week?",
        description: "View upcoming expected payments",
      },
      {
        prompt: "Calculate owner payment for Waldron Road",
        description: "Get detailed owner payment breakdown",
      },
      {
        prompt: "Show me the monthly financial summary",
        description: "Get complete monthly overview",
      },
    ],
  },
  {
    title: "Property Financials",
    icon: BarChart3,
    color: "text-emerald-400",
    prompts: [
      {
        prompt: "How is Waldron Road performing financially?",
        description: "6-month financial breakdown for a property",
      },
      {
        prompt: "What's the total revenue for January?",
        description: "Monthly income and expenses summary",
      },
      {
        prompt: "Show property financials for the last 3 months",
        description: "Recent financial trends",
      },
    ],
  },
  {
    title: "Compliance & Documents",
    icon: Shield,
    color: "text-orange-400",
    prompts: [
      {
        prompt: "What documents are expiring in the next 30 days?",
        description: "Track upcoming document expirations",
      },
      {
        prompt: "Show documents expiring this week",
        description: "Urgent document renewals needed",
      },
      {
        prompt: "Check compliance status for all properties",
        description: "Identify compliance issues and gaps",
      },
      {
        prompt: "Are there any compliance issues at Waldron Road?",
        description: "Property-specific compliance check",
      },
      {
        prompt: "Schedule an inspection for HPS House next Monday",
        description: "Book a property inspection",
      },
    ],
  },
  {
    title: "Contractors",
    icon: HardHat,
    color: "text-cyan-400",
    prompts: [
      {
        prompt: "Show me all plumbing contractors",
        description: "Find contractors by trade",
      },
      {
        prompt: "What's the history for ABC Plumbing?",
        description: "View contractor performance and jobs",
      },
      {
        prompt: "Who's the best electrician we've used?",
        description: "Compare contractor metrics",
      },
    ],
  },
  {
    title: "Incidents & Safety",
    icon: AlertTriangle,
    color: "text-rose-400",
    prompts: [
      {
        prompt: "Show incidents from the last 30 days",
        description: "Recent incident summary",
      },
      {
        prompt: "Any incidents at HPS House this month?",
        description: "Property-specific incident report",
      },
      {
        prompt: "Are there any pending NDIS notifications?",
        description: "Check NDIS reporting compliance",
      },
    ],
  },
  {
    title: "Actions & Updates",
    icon: ArrowRightLeft,
    color: "text-purple-400",
    prompts: [
      {
        prompt: "Move Sarah to HPS House at Waldron Road",
        description: "Transfer a participant to a new dwelling",
      },
      {
        prompt: "Update Daniel's status to inactive",
        description: "Change participant status",
      },
      {
        prompt: "Schedule inspection for Waldron Road on Friday",
        description: "Book a property inspection",
      },
    ],
  },
];

export default function AIHelpGuide({ onTryPrompt, disabled }: AIHelpGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleTryPrompt = (prompt: string) => {
    onTryPrompt(prompt);
    setIsOpen(false);
  };

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
      >
        <HelpCircle className="w-4 h-4" />
        Sample Prompts
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-white">AI Assistant Guide</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Click any prompt to try it, or use your own words
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4">
              {/* Tips */}
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                <h3 className="text-blue-200 font-semibold mb-2">Tips for Best Results</h3>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>- Use natural language - ask like you're talking to a colleague</li>
                  <li>- Be specific with names and locations when needed</li>
                  <li>- For actions (moving, creating), you'll be asked to confirm</li>
                  <li>- Upload documents using the paperclip button for analysis</li>
                </ul>
              </div>

              {/* Categories */}
              <div className="space-y-3">
                {promptCategories.map((category) => (
                  <div key={category.title} className="bg-gray-700/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category.title ? null : category.title
                        )
                      }
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <category.icon className={`w-5 h-5 ${category.color}`} />
                        <span className="text-white font-medium">{category.title}</span>
                        <span className="text-gray-400 text-sm">
                          ({category.prompts.length} prompts)
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedCategory === category.title ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {expandedCategory === category.title && (
                      <div className="px-4 pb-3 space-y-2">
                        {category.prompts.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleTryPrompt(item.prompt)}
                            disabled={disabled}
                            className="w-full text-left p-3 bg-gray-800 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <p className="text-white text-sm group-hover:text-blue-300 transition-colors">
                              "{item.prompt}"
                            </p>
                            <p className="text-gray-400 text-xs mt-1">{item.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* All Sample Prompts Quick List */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-3">All Sample Prompts</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {promptCategories.flatMap((cat) =>
                    cat.prompts.map((item, idx) => (
                      <button
                        key={`${cat.title}-${idx}`}
                        onClick={() => handleTryPrompt(item.prompt)}
                        disabled={disabled}
                        className="text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                      >
                        {item.prompt}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
