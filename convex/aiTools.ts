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
];

// List of action tools that require confirmation
export const ACTION_TOOLS = [
  "move_participant",
  "create_maintenance_request",
  "update_maintenance_status",
  "record_payment",
  "update_participant_status",
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
    default:
      return `Execute ${toolName}`;
  }
}
