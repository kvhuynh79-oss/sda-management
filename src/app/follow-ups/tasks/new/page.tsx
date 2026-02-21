"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { FormInput, FormSelect, FormTextarea, Button } from "@/components/forms";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get pre-populated values from URL params
  const preParticipantId = searchParams.get("participantId") || "";
  const preCommunicationId = searchParams.get("communicationId") || "";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    reminderDate: "",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    category: "general" as "funding" | "plan_approval" | "documentation" | "follow_up" | "general",
    linkedParticipantId: preParticipantId,
    linkedPropertyId: "",
    linkedCommunicationId: preCommunicationId,
    assignedToUserId: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // Default assign to current user
      setFormData((prev) => ({ ...prev, assignedToUserId: parsedUser.id }));
    }
  }, []);

  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const users = useQuery(
    api.auth.getAllUsers,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const createTask = useMutation(api.tasks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createTask({
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
        linkedCommunicationId: formData.linkedCommunicationId
          ? (formData.linkedCommunicationId as Id<"communications">)
          : undefined,
        assignedToUserId: formData.assignedToUserId
          ? (formData.assignedToUserId as Id<"users">)
          : undefined,
        createdBy: user.id as Id<"users">,
      });

      router.push("/follow-ups");
    } catch (err) {
      setError("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || participants === undefined || properties === undefined || users === undefined) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <LoadingScreen fullScreen={false} message="Loading..." />
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="communications" />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">New Task</h1>
            <p className="text-gray-400 mt-1">Create a new follow-up task</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Task Details</h2>

              <div className="space-y-4">
                <FormInput
                  label="Title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Follow up on Faith's SDA funding"
                />

                <FormTextarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this task..."
                  rows={3}
                />
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Scheduling</h2>

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
                  helperText="Optional: Get reminded before due date"
                />
              </div>
            </div>

            {/* Classification */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Classification</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "low", label: "Low", color: "bg-gray-600" },
                      { value: "medium", label: "Medium", color: "bg-yellow-600" },
                      { value: "high", label: "High", color: "bg-orange-600" },
                      { value: "urgent", label: "Urgent", color: "bg-red-600" },
                    ].map((priority) => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, priority: priority.value as any })
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.priority === priority.value
                            ? `${priority.color} text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-white`
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                <FormSelect
                  label="Category"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as any })
                  }
                  options={[
                    { value: "funding", label: "Funding" },
                    { value: "plan_approval", label: "Plan Approval" },
                    { value: "documentation", label: "Documentation" },
                    { value: "follow_up", label: "Follow-up" },
                    { value: "general", label: "General" },
                  ]}
                />
              </div>
            </div>

            {/* Linking */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Link to Record</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Participant"
                  value={formData.linkedParticipantId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedParticipantId: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- Select Participant --" },
                    ...participants.map((p) => ({
                      value: p._id,
                      label: `${p.firstName} ${p.lastName}`,
                    })),
                  ]}
                />

                <FormSelect
                  label="Property"
                  value={formData.linkedPropertyId}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedPropertyId: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- Select Property --" },
                    ...properties.map((p) => ({
                      value: p._id,
                      label: p.propertyName || p.addressLine1,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Assignment</h2>

              <FormSelect
                label="Assign To"
                value={formData.assignedToUserId}
                onChange={(e) =>
                  setFormData({ ...formData, assignedToUserId: e.target.value })
                }
                options={[
                  { value: "", label: "-- Unassigned --" },
                  ...users
                    .filter((u) => u.isActive)
                    .map((u) => ({
                      value: u._id,
                      label: `${u.firstName} ${u.lastName}`,
                    })),
                ]}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
              >
                Create Task
              </Button>
            </div>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}
