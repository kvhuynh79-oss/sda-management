"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { CommunicationTypeBadge, ContactTypeBadge, DirectionBadge } from "@/components/ui/Badge";
import { FormInput, FormSelect, FormTextarea, Button } from "@/components/forms";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function CommunicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const communicationId = params.id as string;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    communicationType: "phone_call" as "email" | "sms" | "phone_call" | "meeting" | "other",
    direction: "sent" as "sent" | "received",
    communicationDate: "",
    communicationTime: "",
    contactType: "ndia" as "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    subject: "",
    summary: "",
    linkedParticipantId: "",
    linkedPropertyId: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser({ id: parsed._id || parsed.id, role: parsed.role });
    }
  }, []);

  const communication = useQuery(api.communications.getById, user ? { id: communicationId as Id<"communications">, userId: user.id as Id<"users"> } : "skip");
  const relatedTasks = useQuery(api.tasks.getByCommunication, user ? { communicationId: communicationId as Id<"communications">, userId: user.id as Id<"users"> } : "skip");
  const participants = useQuery(
    api.participants.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  const updateCommunication = useMutation(api.communications.update);
  const deleteCommunication = useMutation(api.communications.remove);
  const { confirm: confirmDialog } = useConfirmDialog();

  // Initialize form data when communication loads
  useEffect(() => {
    if (communication) {
      setFormData({
        communicationType: communication.communicationType,
        direction: communication.direction,
        communicationDate: communication.communicationDate,
        communicationTime: communication.communicationTime || "",
        contactType: communication.contactType,
        contactName: communication.contactName,
        contactEmail: communication.contactEmail || "",
        contactPhone: communication.contactPhone || "",
        subject: communication.subject || "",
        summary: communication.summary,
        linkedParticipantId: communication.linkedParticipantId || "",
        linkedPropertyId: communication.linkedPropertyId || "",
      });
    }
  }, [communication]);

  const handleSave = async () => {
    if (!user || !communication) return;
    setIsSaving(true);

    try {
      await updateCommunication({
        id: communication._id,
        communicationType: formData.communicationType,
        direction: formData.direction,
        communicationDate: formData.communicationDate,
        communicationTime: formData.communicationTime || undefined,
        contactType: formData.contactType,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        subject: formData.subject || undefined,
        summary: formData.summary,
        linkedParticipantId: formData.linkedParticipantId
          ? (formData.linkedParticipantId as Id<"participants">)
          : undefined,
        linkedPropertyId: formData.linkedPropertyId
          ? (formData.linkedPropertyId as Id<"properties">)
          : undefined,
        userId: user.id as Id<"users">,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save communication:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreCommunication = useMutation(api.communications.restore);

  const handleDelete = async () => {
    if (!user || !communication) return;
    if (!(await confirmDialog({ title: "Confirm Delete", message: "Are you sure you want to delete this communication? It can be restored by an admin.", variant: "danger" }))) return;

    try {
      await deleteCommunication({
        id: communication._id,
        userId: user.id as Id<"users">,
      });
      router.push("/communications");
    } catch (error) {
      console.error("Failed to delete communication:", error);
    }
  };

  const handleRestore = async () => {
    if (!user || !communication) return;
    try {
      await restoreCommunication({
        id: communication._id,
        userId: user.id as Id<"users">,
      });
    } catch (error) {
      console.error("Failed to restore:", error);
    }
  };

  if (!user || communication === undefined || participants === undefined || properties === undefined) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <LoadingScreen fullScreen={false} message="Loading communication..." />
        </div>
      </RequireAuth>
    );
  }

  if (communication === null) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="communications" />
          <main className="max-w-3xl mx-auto px-4 py-8 text-center">
            <p className="text-gray-400">Communication not found</p>
            <Link href="/follow-ups" className="text-teal-500 hover:text-teal-400 mt-4 inline-block">
              Back to Follow-ups
            </Link>
          </main>
        </div>
      </RequireAuth>
    );
  }

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
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-white">Communication Details</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <DirectionBadge direction={communication.direction} />
                <CommunicationTypeBadge type={communication.communicationType} />
                <ContactTypeBadge contactType={communication.contactType} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {communication.contactName}
              </h1>
              {communication.subject && (
                <p className="text-gray-300 mt-1">{communication.subject}</p>
              )}
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
                  <Link
                    href={`/follow-ups/tasks/new?communicationId=${communication._id}${communication.linkedParticipantId ? `&participantId=${communication.linkedParticipantId}` : ""}`}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                  >
                    + Create Task
                  </Link>
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Deleted banner */}
          {communication.isDeleted && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-red-400 font-medium">This communication has been deleted</p>
                <p className="text-red-400/70 text-sm">
                  Deleted{communication.deletedAt ? ` on ${new Date(communication.deletedAt).toLocaleDateString()}` : ""}
                </p>
                {user.role !== "admin" && (
                  <p className="text-red-400/60 text-xs mt-1">Contact an admin to restore this communication.</p>
                )}
              </div>
              {user.role === "admin" && (
                <button
                  onClick={handleRestore}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  Restore
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
              {isEditing ? (
                <FormTextarea
                  label="Summary"
                  hideLabel
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={5}
                />
              ) : (
                <p className="text-gray-300 whitespace-pre-wrap">{communication.summary}</p>
              )}
            </div>

            {/* Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Details</h2>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Type"
                    value={formData.communicationType}
                    onChange={(e) => setFormData({ ...formData, communicationType: e.target.value as any })}
                    options={[
                      { value: "phone_call", label: "Phone Call" },
                      { value: "email", label: "Email" },
                      { value: "sms", label: "SMS" },
                      { value: "meeting", label: "Meeting" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <FormSelect
                    label="Direction"
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value as any })}
                    options={[
                      { value: "sent", label: "Sent (Outgoing)" },
                      { value: "received", label: "Received (Incoming)" },
                    ]}
                  />
                  <FormInput
                    label="Date"
                    type="date"
                    value={formData.communicationDate}
                    onChange={(e) => setFormData({ ...formData, communicationDate: e.target.value })}
                  />
                  <FormInput
                    label="Time"
                    type="time"
                    value={formData.communicationTime}
                    onChange={(e) => setFormData({ ...formData, communicationTime: e.target.value })}
                  />
                  <FormSelect
                    label="Contact Type"
                    value={formData.contactType}
                    onChange={(e) => setFormData({ ...formData, contactType: e.target.value as any })}
                    options={[
                      { value: "ndia", label: "NDIA" },
                      { value: "support_coordinator", label: "Support Coordinator" },
                      { value: "plan_manager", label: "Plan Manager" },
                      { value: "sil_provider", label: "SIL Provider" },
                      { value: "participant", label: "Participant" },
                      { value: "family", label: "Family Member" },
                      { value: "ot", label: "OT" },
                      { value: "contractor", label: "Contractor" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <FormInput
                    label="Contact Name"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                  <FormInput
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Date</span>
                    <p className="text-white">
                      {communication.communicationDate}
                      {communication.communicationTime && ` at ${communication.communicationTime}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Logged</span>
                    <p className="text-white">{new Date(communication.createdAt).toLocaleDateString()}</p>
                  </div>
                  {communication.contactEmail && (
                    <div>
                      <span className="text-gray-400">Email</span>
                      <p className="text-white">{communication.contactEmail}</p>
                    </div>
                  )}
                  {communication.contactPhone && (
                    <div>
                      <span className="text-gray-400">Phone</span>
                      <p className="text-white">{communication.contactPhone}</p>
                    </div>
                  )}
                  {communication.participant && (
                    <div>
                      <span className="text-gray-400">Participant</span>
                      <p className="text-white">
                        <Link href={`/participants/${communication.linkedParticipantId}`} className="text-teal-500 hover:text-teal-400">
                          {communication.participant.firstName} {communication.participant.lastName}
                        </Link>
                      </p>
                    </div>
                  )}
                  {communication.property && (
                    <div>
                      <span className="text-gray-400">Property</span>
                      <p className="text-white">
                        <Link href={`/properties/${communication.linkedPropertyId}`} className="text-teal-500 hover:text-teal-400">
                          {communication.property.propertyName || communication.property.addressLine1}
                        </Link>
                      </p>
                    </div>
                  )}
                  {communication.createdByUser && (
                    <div>
                      <span className="text-gray-400">Logged By</span>
                      <p className="text-white">
                        {communication.createdByUser.firstName} {communication.createdByUser.lastName}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachment */}
            {communication.attachmentFileName && communication.attachmentUrl && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Attachment</h2>
                <a
                  href={communication.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                  <div>
                    <p className="text-white font-medium">{communication.attachmentFileName}</p>
                    <p className="text-gray-400 text-sm">Click to download</p>
                  </div>
                </a>
              </div>
            )}

            {/* Related Tasks */}
            {relatedTasks && relatedTasks.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Related Tasks</h2>
                <div className="space-y-2">
                  {relatedTasks.map((task) => (
                    <Link
                      key={task._id}
                      href={`/follow-ups/tasks/${task._id}`}
                      className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{task.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          task.status === "completed" ? "bg-green-600" :
                          task.status === "in_progress" ? "bg-teal-700" :
                          "bg-yellow-600"
                        } text-white`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">Due: {task.dueDate}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {!communication.isDeleted && (
              <div className="bg-gray-800 rounded-lg p-6 border border-red-600/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                <Button variant="danger" onClick={handleDelete}>
                  Delete Communication
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
