// AI Utilities - Shared functions for Claude API interactions

// Claude API configuration
export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

// Type definitions
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

export interface ClaudeContentBlock {
  type: "text" | "image" | "document" | "tool_use" | "tool_result";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ClaudeToolUse {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Helper function to check if messages contain PDF document blocks
function messagesContainPdfDocument(messages: ClaudeMessage[]): boolean {
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "document") {
          return true;
        }
      }
    }
  }
  return false;
}

// Helper function to call Claude API
export async function callClaudeAPI(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = 4096
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured. Add it to your Convex environment variables."
    );
  }

  // Build headers - add PDF beta header when document blocks are present
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };

  if (messagesContainPdfDocument(messages)) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages,
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Claude API error:", errorData);
    throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const content = data.content[0]?.text;

  if (!content) {
    throw new Error("No response content from Claude API");
  }

  return content;
}

// Helper function to call Claude API with tool calling
export async function callClaudeWithTools(
  systemPrompt: string,
  messages: ClaudeMessage[],
  tools: ClaudeTool[],
  maxTokens: number = 4096
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured. Add it to your Convex environment variables."
    );
  }

  // Build headers - add PDF beta header when document blocks are present
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };

  if (messagesContainPdfDocument(messages)) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages,
      system: systemPrompt,
      tools,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Claude API error:", errorData);
    throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
  }

  return (await response.json()) as ClaudeResponse;
}

// Extract tool use from Claude response
export function extractToolUse(response: ClaudeResponse): ClaudeToolUse | null {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.id && block.name && block.input) {
      return {
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      };
    }
  }
  return null;
}

// Extract text from Claude response
export function extractText(response: ClaudeResponse): string {
  for (const block of response.content) {
    if (block.type === "text" && block.text) {
      return block.text;
    }
  }
  return "";
}

// Helper function to extract JSON from Claude's response
export function extractJSON<T>(response: string): T {
  // Find JSON in the response (Claude sometimes adds explanation text)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in Claude response");
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
}

// Helper function to extract JSON array from Claude's response
export function extractJSONArray<T>(response: string): T[] {
  // Find JSON array in the response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON array in Claude response");
  }

  try {
    return JSON.parse(jsonMatch[0]) as T[];
  } catch (error) {
    throw new Error(`Failed to parse JSON array: ${error}`);
  }
}

// Helper function to create a vision message with document/image
export function createVisionMessage(
  textPrompt: string,
  fileBase64: string,
  mediaType: string
): ClaudeMessage {
  const isPdf = mediaType === "application/pdf";

  const content: ClaudeContentBlock[] = [
    isPdf
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: fileBase64,
          },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: fileBase64,
          },
        },
    {
      type: "text",
      text: textPrompt,
    },
  ];

  return {
    role: "user",
    content,
  };
}

// Format date for display (YYYY-MM-DD to readable)
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Calculate days until a date
export function daysUntil(dateString: string): number {
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Fuzzy match helper for participant names
export function fuzzyMatch(searchTerm: string, target: string): boolean {
  const search = searchTerm.toLowerCase().trim();
  const targetLower = target.toLowerCase();

  // Exact match
  if (targetLower.includes(search)) return true;

  // Check if search terms match individually
  const searchTerms = search.split(/\s+/);
  return searchTerms.every((term) => targetLower.includes(term));
}
