import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { authenticateSessionRequest } from "../../_lib/sessionAuth";
import { API_CORS_HEADERS } from "../../_lib/auth";

/**
 * REST API - Widget Tasks Endpoint
 *
 * GET  /api/v1/tasks/widget - List tasks for the authenticated user's widget
 * POST /api/v1/tasks/widget - Mark a task as completed from the widget
 *
 * Authentication: Bearer <session_token> in Authorization header
 * (uses session-token auth, not API key auth, since end users don't have API keys)
 */

let _convex: ConvexHttpClient | null = null;

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

/**
 * GET /api/v1/tasks/widget
 *
 * Query parameters:
 * - filter: "assigned" | "overdue" | "upcoming" (default: all active tasks)
 * - limit: Maximum results (1-25, default 10)
 *
 * Returns compact task objects for widget display.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateSessionRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  try {
    const convex = getConvex();
    const { searchParams } = new URL(request.url);

    const filterParam = searchParams.get("filter") as
      | "assigned"
      | "overdue"
      | "upcoming"
      | null;
    const filter =
      filterParam && ["assigned", "overdue", "upcoming"].includes(filterParam)
        ? filterParam
        : undefined;

    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 25)
      : undefined;

    const tasks = await convex.query(api.apiQueries.listWidgetTasks, {
      userId: auth.userId,
      filter,
      limit,
    });

    return NextResponse.json(
      {
        data: tasks,
        meta: {
          count: tasks.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[Widget API] GET /api/v1/tasks/widget error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * POST /api/v1/tasks/widget
 *
 * Request body (JSON):
 * - taskId: string (required) - The ID of the task to mark as completed
 *
 * Marks the specified task as "completed" using the tasks.updateStatus mutation.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateSessionRequest(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: API_CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();

    if (!body.taskId) {
      return NextResponse.json(
        { error: "Missing required field: taskId" },
        { status: 400, headers: API_CORS_HEADERS }
      );
    }

    const convex = getConvex();

    const result = await convex.mutation(api.tasks.updateStatus, {
      id: body.taskId as Id<"tasks">,
      status: "completed",
      userId: auth.userId,
    });

    return NextResponse.json(
      {
        data: { taskId: result, status: "completed" },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 200, headers: API_CORS_HEADERS }
    );
  } catch (err) {
    console.error("[Widget API] POST /api/v1/tasks/widget error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: API_CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: API_CORS_HEADERS });
}
