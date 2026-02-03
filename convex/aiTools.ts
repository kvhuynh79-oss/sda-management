// AI Tool Definitions for Claude Tool Calling
import { ClaudeTool } from "./aiUtils";

// Tool definitions for the SDA Assistant
export const SDA_ASSISTANT_TOOLS: ClaudeTool[] = [
  // Query Tools - Read-only operations
  {
    name: "get_vacancies",
    description:
      "Get a list of vacant rooms and dwellings. Use this when the user asks about available spaces, empty rooms, or vacancies.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description:
            "Optional property name or address to filter by. Leave empty for all properties.",
        },
        suburb: {
          type: "string",
          description: "Optional suburb to filter by.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_participant_plan_expiry",
    description:
      "Get information about when a participant's NDIS plan expires. Use this when asked about plan expiry dates.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description:
            "The name of the participant to look up (first name, last name, or full name).",
        },
      },
      required: ["participant_name"],
    },
  },
  {
    name: "get_expiring_plans",
    description:
      "Get a list of participant plans expiring within a specified number of days. Use when asked about upcoming plan expirations.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description:
            "Number of days to look ahead for expiring plans. Default is 60.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_overdue_maintenance",
    description:
      "Get overdue and outstanding maintenance requests. Use when asked about maintenance issues, pending repairs, or overdue work.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "Optional property name to filter by.",
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Optional priority level to filter by.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_payment_status",
    description:
      "Get payment history and status for a participant. Use when asked about payments, billing, or payment records.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description: "The name of the participant.",
        },
      },
      required: ["participant_name"],
    },
  },
  {
    name: "get_expiring_documents",
    description:
      "Get documents expiring within a specified number of days. Use for compliance tracking, document expiry alerts.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description:
            "Number of days to look ahead for expiring documents. Default is 30.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_property_summary",
    description:
      "Get detailed summary of a property including dwellings, occupants, and recent maintenance. Use when asked about a specific property.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "The property name, address, or suburb to look up.",
        },
      },
      required: ["property_name"],
    },
  },
  {
    name: "get_participant_info",
    description:
      "Get detailed information about a participant including their location and plan. Use when asked about a specific participant.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description: "The name of the participant.",
        },
      },
      required: ["participant_name"],
    },
  },
  {
    name: "list_all_participants",
    description:
      "Get a list of all active participants with their current locations. Use when asked for a participant list or overview.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_recent_activity",
    description:
      "Get recent activity summary including payments, maintenance, and incidents. Use for activity summaries or dashboards.",
    input_schema: {
      type: "object",
      properties: {
        days_back: {
          type: "number",
          description: "Number of days to look back. Default is 7.",
        },
      },
      required: [],
    },
  },

  // Action Tools - Write operations (require confirmation)
  {
    name: "move_participant",
    description:
      "Move a participant to a different dwelling. Use when asked to relocate, transfer, or move a participant.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description: "The name of the participant to move.",
        },
        target_dwelling: {
          type: "string",
          description: "The dwelling name to move to (e.g., 'HPS House', 'Main House').",
        },
        target_property: {
          type: "string",
          description:
            "Optional property name if the dwelling name is ambiguous.",
        },
      },
      required: ["participant_name", "target_dwelling"],
    },
  },
  {
    name: "create_maintenance_request",
    description:
      "Create a new maintenance request. Use when asked to log, report, or create a maintenance issue.",
    input_schema: {
      type: "object",
      properties: {
        dwelling_name: {
          type: "string",
          description: "The dwelling where the issue is located.",
        },
        property_name: {
          type: "string",
          description: "Optional property name for disambiguation.",
        },
        title: {
          type: "string",
          description: "Short title for the maintenance request.",
        },
        description: {
          type: "string",
          description: "Detailed description of the issue.",
        },
        category: {
          type: "string",
          enum: [
            "plumbing",
            "electrical",
            "appliances",
            "building",
            "grounds",
            "safety",
            "general",
          ],
          description: "Category of the maintenance issue.",
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Priority level. Default is medium.",
        },
      },
      required: ["dwelling_name", "title", "description"],
    },
  },
  {
    name: "update_maintenance_status",
    description:
      "Update the status of a maintenance request. Use when asked to mark maintenance as completed, in progress, etc.",
    input_schema: {
      type: "object",
      properties: {
        maintenance_title: {
          type: "string",
          description: "The title or description of the maintenance request.",
        },
        dwelling_name: {
          type: "string",
          description:
            "Alternative: the dwelling name to find the most recent request.",
        },
        new_status: {
          type: "string",
          enum: [
            "reported",
            "awaiting_quotes",
            "quoted",
            "approved",
            "scheduled",
            "in_progress",
            "completed",
            "cancelled",
          ],
          description: "The new status to set.",
        },
      },
      required: ["new_status"],
    },
  },
  {
    name: "record_payment",
    description:
      "Record a payment for a participant. Use when asked to log, add, or record a payment.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description: "The name of the participant.",
        },
        amount: {
          type: "number",
          description: "The payment amount in dollars.",
        },
        payment_date: {
          type: "string",
          description: "Optional payment date in YYYY-MM-DD format. Defaults to today.",
        },
      },
      required: ["participant_name", "amount"],
    },
  },
  {
    name: "update_participant_status",
    description:
      "Update a participant's status (active, inactive, moved_out). Use when asked to change participant status.",
    input_schema: {
      type: "object",
      properties: {
        participant_name: {
          type: "string",
          description: "The name of the participant.",
        },
        new_status: {
          type: "string",
          enum: ["active", "inactive", "pending_move_in", "moved_out"],
          description: "The new status to set.",
        },
      },
      required: ["participant_name", "new_status"],
    },
  },
  {
    name: "generate_text_response",
    description:
      "Generate a helpful text response when no specific tool is needed. Use for general questions, clarifications, or greetings.",
    input_schema: {
      type: "object",
      properties: {
        response_type: {
          type: "string",
          enum: ["greeting", "clarification", "help", "general", "unknown"],
          description: "The type of response needed.",
        },
        context: {
          type: "string",
          description: "Any relevant context for generating the response.",
        },
      },
      required: ["response_type"],
    },
  },

  // New Query Tools
  {
    name: "calculate_owner_payment",
    description:
      "Calculate the monthly owner payment for a property. Shows SDA income, RRC income, management fees, and net payment. Use when asked about owner payments, landlord payments, or property revenue.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "The property name or address to calculate payment for.",
        },
        month: {
          type: "string",
          description: "The month to calculate for in YYYY-MM format. Defaults to current month.",
        },
      },
      required: ["property_name"],
    },
  },
  {
    name: "get_compliance_status",
    description:
      "Check compliance status for a property including expiring certificates, overdue inspections, and missing documents. Use when asked about compliance, certifications, or audits.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "The property name or address to check. Leave empty for all properties.",
        },
      },
      required: [],
    },
  },
  {
    name: "match_participant_to_vacancy",
    description:
      "Find suitable vacancies for a participant based on their SDA design category and needs. Use when asked to find a place for a new participant or match participants to vacancies.",
    input_schema: {
      type: "object",
      properties: {
        sda_category: {
          type: "string",
          enum: ["improved_liveability", "fully_accessible", "robust", "high_physical_support"],
          description: "The SDA design category the participant is eligible for.",
        },
        suburb: {
          type: "string",
          description: "Optional preferred suburb.",
        },
      },
      required: ["sda_category"],
    },
  },
  {
    name: "get_contractor_history",
    description:
      "Get a contractor's work history including past jobs, average response time, and quotes. Use when asked about contractor performance or history.",
    input_schema: {
      type: "object",
      properties: {
        contractor_name: {
          type: "string",
          description: "The contractor's name or business name.",
        },
        trade: {
          type: "string",
          description: "Optional trade type to filter by (e.g., plumbing, electrical).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_property_financials",
    description:
      "Get financial summary for a property including revenue, expenses, and occupancy trends. Use when asked about property performance or financials.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "The property name or address.",
        },
        months: {
          type: "number",
          description: "Number of months to include. Default is 6.",
        },
      },
      required: ["property_name"],
    },
  },
  {
    name: "get_incident_summary",
    description:
      "Get incident summary for a property or participant. Use when asked about incidents, safety issues, or reportable events.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "Optional property name to filter by.",
        },
        participant_name: {
          type: "string",
          description: "Optional participant name to filter by.",
        },
        days_back: {
          type: "number",
          description: "Number of days to look back. Default is 30.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_payments",
    description:
      "Get upcoming expected payments including SDA claims and RRC due. Use when asked about expected income, upcoming payments, or claims due.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "Number of days to look ahead. Default is 14.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_monthly_summary",
    description:
      "Get a monthly financial and operational summary. Use when asked for monthly summaries, dashboards, or overall status.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "The month in YYYY-MM format. Defaults to current month.",
        },
      },
      required: [],
    },
  },

  // New Action Tools
  {
    name: "schedule_inspection",
    description:
      "Schedule a property inspection. Use when asked to schedule, book, or plan an inspection.",
    input_schema: {
      type: "object",
      properties: {
        property_name: {
          type: "string",
          description: "The property to inspect.",
        },
        dwelling_name: {
          type: "string",
          description: "Optional specific dwelling to inspect.",
        },
        scheduled_date: {
          type: "string",
          description: "The date to schedule in YYYY-MM-DD format.",
        },
        template_name: {
          type: "string",
          description: "Optional inspection template name. Default is 'BLS Property Inspection'.",
        },
      },
      required: ["property_name", "scheduled_date"],
    },
  },
  {
    name: "send_quote_request",
    description:
      "Send a quote request to contractors for a maintenance job. Use when asked to get quotes, request quotes, or contact contractors.",
    input_schema: {
      type: "object",
      properties: {
        maintenance_title: {
          type: "string",
          description: "The maintenance request title or description.",
        },
        dwelling_name: {
          type: "string",
          description: "The dwelling where the work is needed.",
        },
        contractor_names: {
          type: "array",
          items: { type: "string" },
          description: "List of contractor names to send quote requests to.",
        },
        expiry_days: {
          type: "number",
          description: "Number of days until quote expires. Default is 7.",
        },
      },
      required: ["maintenance_title", "dwelling_name"],
    },
  },
];

// List of action tools that require confirmation
export const ACTION_TOOLS = [
  "move_participant",
  "create_maintenance_request",
  "update_maintenance_status",
  "record_payment",
  "update_participant_status",
  "schedule_inspection",
  "send_quote_request",
];

// Check if a tool requires confirmation
export function requiresConfirmation(toolName: string): boolean {
  return ACTION_TOOLS.includes(toolName);
}

// Get human-readable description for a tool action
export function getActionDescription(
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case "move_participant":
      return `Move ${input.participant_name} to ${input.target_dwelling}${input.target_property ? ` at ${input.target_property}` : ""}`;
    case "create_maintenance_request":
      return `Create maintenance: "${input.title}" at ${input.dwelling_name}${input.property_name ? ` (${input.property_name})` : ""} - Priority: ${input.priority || "medium"}`;
    case "update_maintenance_status":
      return `Update maintenance ${input.maintenance_title || `at ${input.dwelling_name}`} to "${input.new_status}"`;
    case "record_payment":
      return `Record $${Number(input.amount).toLocaleString()} payment for ${input.participant_name}`;
    case "update_participant_status":
      return `Update ${input.participant_name}'s status to "${input.new_status}"`;
    case "schedule_inspection":
      return `Schedule inspection for ${input.property_name}${input.dwelling_name ? ` (${input.dwelling_name})` : ""} on ${input.scheduled_date}`;
    case "send_quote_request":
      return `Send quote request for "${input.maintenance_title}" to contractors`;
    default:
      return `Execute ${toolName}`;
  }
}
