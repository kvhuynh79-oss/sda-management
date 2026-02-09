"use client";

import Link from "next/link";
import { TaskStatusBadge, TaskCategoryBadge, PriorityBadge } from "./Badge";

interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    dueDate: string;
    priority: "urgent" | "high" | "medium" | "low";
    status: "pending" | "in_progress" | "completed" | "cancelled";
    category: "funding" | "plan_approval" | "documentation" | "follow_up" | "general";
    isOverdue?: boolean;
    participant?: {
      firstName: string;
      lastName: string;
    } | null;
    assignedToUser?: {
      firstName: string;
      lastName: string;
    } | null;
  };
  onStatusChange?: (taskId: string, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => void;
  showQuickActions?: boolean;
}

export default function TaskCard({ task, onStatusChange, showQuickActions = true }: TaskCardProps) {
  const isActive = task.status !== "completed" && task.status !== "cancelled";

  return (
    <article
      className={`bg-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-700 transition-colors border-l-4 ${
        task.isOverdue
          ? "border-red-500"
          : task.priority === "urgent"
          ? "border-orange-500"
          : task.priority === "high"
          ? "border-yellow-500"
          : "border-gray-700"
      }`}
      role="listitem"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <TaskCategoryBadge category={task.category} />
            {task.isOverdue && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-600 text-white animate-pulse">
                OVERDUE
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white truncate">{task.title}</h3>

          {/* Description */}
          {task.description && (
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showQuickActions && isActive && onStatusChange && (
            <>
              {task.status === "pending" && (
                <button
                  onClick={() => onStatusChange(task._id, "in_progress")}
                  className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label={`Start task: ${task.title}`}
                >
                  Start
                </button>
              )}
              {task.status === "in_progress" && (
                <button
                  onClick={() => onStatusChange(task._id, "completed")}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-label={`Complete task: ${task.title}`}
                >
                  Complete
                </button>
              )}
            </>
          )}
          <Link
            href={`/follow-ups/tasks/${task._id}`}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            View
          </Link>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-gray-400 mt-3 pt-3 border-t border-gray-700">
        <div>
          <span className="text-gray-400">Due:</span>{" "}
          <span className={task.isOverdue ? "text-red-400 font-medium" : ""}>
            {task.dueDate}
          </span>
        </div>
        {task.participant && (
          <div>
            <span className="text-gray-400">Participant:</span>{" "}
            {task.participant.firstName} {task.participant.lastName}
          </div>
        )}
        {task.assignedToUser && (
          <div>
            <span className="text-gray-400">Assigned to:</span>{" "}
            {task.assignedToUser.firstName} {task.assignedToUser.lastName}
          </div>
        )}
      </div>
    </article>
  );
}
