"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { TaskStatusBadge, TaskCategoryBadge, PriorityBadge } from "@/components/ui/Badge";
import { FormInput, FormSelect, FormTextarea, Button } from "@/components/forms";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    reminderDate: "",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    category: "general" as "funding" | "plan_approval" | "documentation" | "follow_up" | "general",
    linkedParticipantId: "",
    linkedPropertyId: "",
    assignedToUserId: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const task = useQuery(api.tasks.getById, user ? { id: taskId as Id<"tasks">, userId: user.id as Id<"users"> } : "skip");
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const users = useQuery(
    api.auth.getAllUsers,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const updateTask = useMutation(api.tasks.update);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const completeTask = useMutation(api.tasks.complete);
  const deleteTask = useMutation(api.tasks.remove);

  // Initialize form data when task loads
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate,
        reminderDate: task.reminderDate || "",
        priority: task.priority,
        category: task.category,
        linkedParticipantId: task.linkedParticipantId || "",
        linkedPropertyId: task.linkedPropertyId || "",
        assignedToUserId: task.assignedToUserId || "",
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!user || !task) return;
    setIsSaving(true);

    try {
      await updateTask({
        id: task._id,
        title: formData.title,
        description: formData.description || undefined,
        dueDate: formData.dueDate,
        reminderDate: formData.reminderDate || undefined,
        priority: formData.priority,
        category: formData.category,
        linkedParticipantId: formData.linkedParticipantId
          ? (formData.linkedParticipantId as Id<"participants">)
          : undefined,
        linkedPropertyId: formData.linkedPropertyId
          ? (formData.linkedPropertyId as Id<"properties">)
          : undefined,
        assignedToUserId: formData.assignedToUserId
          ? (formData.assignedToUserId as Id<"users">)
          : undefined,
        userId: user.id as Id<"users">,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    if (!user || !task) return;

    if (newStatus === "completed") {
      setShowCompleteModal(true);
      return;
    }

    try {
      await updateStatus({
        id: task._id,
        status: newStatus,
        userId: user.id as Id<"users">,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleComplete = async () => {
    if (!user || !task) return;

    try {
      await completeTask({
        id: task._id,
        completionNotes: completionNotes || undefined,
        userId: user.id as Id<"users">,
      });
      setShowCompleteModal(false);
      setCompletionNotes("");
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleDelete = async () => {
    if (!user || !task) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask({
        id: task._id,
        userId: user.id as Id<"users">,
      });
      router.push("/follow-ups");
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  if (!user || task === undefined || participants === undefined || properties === undefined || users === undefined) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <LoadingScreen fullScreen={false} message="Loading task..." />
        </div>
      </RequireAuth>
    );
  }

  if (task === null) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <main className="max-w-3xl mx-auto px-4 py-8 text-center">
            <p className="text-gray-400">Task not found</p>
            <Link href="/follow-ups" className="text-teal-500 hover:text-teal-400 mt-4 inline-block">
              Back to Follow-ups
            </Link>
          </main>
        </div>
      </RequireAuth>
    );
  }

  const isActive = task.status !== "completed" && task.status !== "cancelled";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="communications" />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm">
            <Link href="/follow-ups" className="text-gray-400 hover:text-white">
              Follow-ups
            </Link>
            <span className="text-gray-600 mx-2">/</span>
            <span className="text-white">Task Details</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <TaskStatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <TaskCategoryBadge category={task.category} />
                {task.isOverdue && (
                  <span className="px-2 py-0.5 rounded text-xs bg-red-600 text-white font-semibold ring-2 ring-red-500/40 ring-offset-1 ring-offset-gray-800">
                    OVERDUE
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  task.title
                )}
              </h1>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} isLoading={isSaving}>
                    Save
                  </Button>
                </>
              ) : (
                <>
                  {isActive && (
                    <>
                      {task.status === "pending" && (
                        <Button variant="secondary" onClick={() => handleStatusChange("in_progress")}>
                          Start
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button onClick={() => handleStatusChange("completed")}>
                          Complete
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Description */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
              {isEditing ? (
                <FormTextarea
                  label="Description"
                  hideLabel
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-gray-300">
                  {task.description || <span className="text-gray-400 italic">No description</span>}
                </p>
              )}
            </div>

            {/* Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Due Date"
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                  <FormInput
                    label="Reminder Date"
                    type="date"
                    value={formData.reminderDate}
                    onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                  />
                  <FormSelect
                    label="Priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ]}
                  />
                  <FormSelect
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    options={[
                      { value: "funding", label: "Funding" },
                      { value: "plan_approval", label: "Plan Approval" },
                      { value: "documentation", label: "Documentation" },
                      { value: "follow_up", label: "Follow-up" },
                      { value: "general", label: "General" },
                    ]}
                  />
                  <FormSelect
                    label="Participant"
                    value={formData.linkedParticipantId}
                    onChange={(e) => setFormData({ ...formData, linkedParticipantId: e.target.value })}
                    options={[
                      { value: "", label: "-- None --" },
                      ...participants.map((p) => ({
                        value: p._id,
                        label: `${p.firstName} ${p.lastName}`,
                      })),
                    ]}
                  />
                  <FormSelect
                    label="Assigned To"
                    value={formData.assignedToUserId}
                    onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                    options={[
                      { value: "", label: "-- Unassigned --" },
                      ...users.filter((u) => u.isActive).map((u) => ({
                        value: u._id,
                        label: `${u.firstName} ${u.lastName}`,
                      })),
                    ]}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Due Date</span>
                    <p className={`text-white ${task.isOverdue ? "text-red-400 font-medium" : ""}`}>
                      {task.dueDate}
                    </p>
                  </div>
                  {task.reminderDate && (
                    <div>
                      <span className="text-gray-400">Reminder</span>
                      <p className="text-white">{task.reminderDate}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Created</span>
                    <p className="text-white">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  {task.createdByUser && (
                    <div>
                      <span className="text-gray-400">Created By</span>
                      <p className="text-white">
                        {task.createdByUser.firstName} {task.createdByUser.lastName}
                      </p>
                    </div>
                  )}
                  {task.assignedToUser && (
                    <div>
                      <span className="text-gray-400">Assigned To</span>
                      <p className="text-white">
                        {task.assignedToUser.firstName} {task.assignedToUser.lastName}
                      </p>
                    </div>
                  )}
                  {task.participant && (
                    <div>
                      <span className="text-gray-400">Participant</span>
                      <p className="text-white">
                        <Link href={`/participants/${task.linkedParticipantId}`} className="text-teal-500 hover:text-teal-400">
                          {task.participant.firstName} {task.participant.lastName}
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Completion Info */}
            {task.status === "completed" && (
              <div className="bg-green-900/20 border border-green-600 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-green-400 mb-4">Completion Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Completed On</span>
                    <p className="text-white">{task.completedDate}</p>
                  </div>
                  {task.completedByUser && (
                    <div>
                      <span className="text-gray-400">Completed By</span>
                      <p className="text-white">
                        {task.completedByUser.firstName} {task.completedByUser.lastName}
                      </p>
                    </div>
                  )}
                  {task.completionNotes && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Notes</span>
                      <p className="text-white">{task.completionNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Linked Communication */}
            {task.communication && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Linked Communication</h2>
                <Link
                  href={`/follow-ups/communications/${task.linkedCommunicationId}`}
                  className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <p className="text-white font-medium">
                    {task.communication.communicationType} with {task.communication.contactName}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {task.communication.communicationDate}
                  </p>
                </Link>
              </div>
            )}

            {/* Danger Zone */}
            {isActive && (
              <div className="bg-gray-800 rounded-lg p-6 border border-red-600/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => handleStatusChange("cancelled")}>
                    Cancel Task
                  </Button>
                  <Button variant="danger" onClick={handleDelete}>
                    Delete Task
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-lg font-semibold text-white mb-4">Complete Task</h2>
              <FormTextarea
                label="Completion Notes (Optional)"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about how this task was completed..."
                rows={4}
              />
              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} fullWidth>
                  Mark Complete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
