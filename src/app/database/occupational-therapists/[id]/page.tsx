"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import CommunicationsHistory from "../../../../components/CommunicationsHistory";
import Link from "next/link";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RequireAuth } from "@/components/RequireAuth";

export default function OccupationalTherapistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const otId = params.id as Id<"occupationalTherapists">;

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<Id<"participants"> | "">("");
  const [relationshipType, setRelationshipType] = useState<"sda_assessment" | "ongoing" | "at_prescription" | "home_mod" | "inquiry">("sda_assessment");
  const [assessmentDate, setAssessmentDate] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | string[] | number | undefined>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(storedUser);
    setUserId(user.id as Id<"users">);
  }, [router]);

  const therapist = useQuery(api.occupationalTherapists.getById, userId ? { otId, userId } : "skip");
  const allParticipants = useQuery(
    api.participants.getAll,
    userId ? { userId } : "skip"
  );
  const linkParticipant = useMutation(api.occupationalTherapists.linkParticipant);
  const unlinkParticipant = useMutation(api.occupationalTherapists.unlinkParticipant);
  const updateTherapist = useMutation(api.occupationalTherapists.update);
  const { confirm: confirmDialog } = useConfirmDialog();

  if (therapist === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  if (therapist === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">Occupational therapist not found</p>
            <Link
              href="/database/occupational-therapists"
              className="mt-4 inline-block px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter out already linked participants
  const linkedParticipantIds = new Set(
    therapist.participantHistory?.map((h) => h.participantId) || []
  );
  const availableParticipants = allParticipants?.filter(
    (p) => !linkedParticipantIds.has(p._id)
  );

  const handleLinkParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId || !userId) return;

    await linkParticipant({
      userId,
      occupationalTherapistId: otId,
      participantId: selectedParticipantId as Id<"participants">,
      relationshipType,
      assessmentDate: assessmentDate || undefined,
      notes: linkNotes || undefined,
    });

    setShowLinkModal(false);
    setSelectedParticipantId("");
    setRelationshipType("sda_assessment");
    setAssessmentDate("");
    setLinkNotes("");
  };

  const handleUnlink = async (linkId: Id<"otParticipants">) => {
    if (!userId) return;
    if (await confirmDialog({ title: "Confirm Remove", message: "Remove this participant link?", variant: "danger" })) {
      await unlinkParticipant({ userId, linkId });
    }
  };

  const handleMarkContacted = async () => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    await updateTherapist({
      userId,
      otId,
      lastContactedDate: today,
    });
  };

  const handleStartEdit = () => {
    setEditForm({
      firstName: therapist.firstName,
      lastName: therapist.lastName,
      email: therapist.email,
      phone: therapist.phone || "",
      organization: therapist.organization || "",
      ahpraNumber: therapist.ahpraNumber || "",
      relationship: therapist.relationship || "",
      notes: therapist.notes || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!userId) return;
    await updateTherapist({
      userId,
      otId,
      firstName: editForm.firstName as string,
      lastName: editForm.lastName as string,
      email: editForm.email as string,
      phone: (editForm.phone as string) || undefined,
      organization: (editForm.organization as string) || undefined,
      ahpraNumber: (editForm.ahpraNumber as string) || undefined,
      relationship: (editForm.relationship as string) || undefined,
      notes: (editForm.notes as string) || undefined,
    });
    setIsEditing(false);
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "sda_assessment":
        return "bg-green-500/20 text-green-400";
      case "ongoing":
        return "bg-teal-600/20 text-teal-500";
      case "at_prescription":
        return "bg-purple-500/20 text-purple-400";
      case "home_mod":
        return "bg-yellow-500/20 text-yellow-400";
      case "inquiry":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case "sda_assessment": return "SDA Assessment";
      case "ongoing": return "Ongoing";
      case "at_prescription": return "AT Prescription";
      case "home_mod": return "Home Modification";
      case "inquiry": return "Inquiry";
      default: return type;
    }
  };

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/database/occupational-therapists"
            className="text-teal-500 hover:text-teal-400"
          >
            &larr; Back to Occupational Therapists
          </Link>
        </div>

        {/* OT Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    value={editForm.firstName as string}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="First Name"
                  />
                  <input
                    value={editForm.lastName as string}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Last Name"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">
                    {therapist.firstName} {therapist.lastName}
                  </h1>
                  <span
                    className={`px-2 py-0.5 text-sm rounded-full ${
                      therapist.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {therapist.status}
                  </span>
                </div>
              )}
              {isEditing ? (
                <input
                  value={editForm.organization as string}
                  onChange={(e) => setEditForm({ ...editForm, organization: e.target.value })}
                  className="mt-2 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white w-full"
                  placeholder="Organization"
                />
              ) : (
                therapist.organization && (
                  <p className="text-gray-400 mt-1">{therapist.organization}</p>
                )
              )}
              {therapist.rating && !isEditing && (
                <div className="flex items-center text-yellow-400 mt-2">
                  {"★".repeat(therapist.rating)}
                  {"☆".repeat(5 - therapist.rating)}
                  <span className="text-gray-400 ml-2 text-sm">
                    ({therapist.rating}/5)
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleMarkContacted}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Mark Contacted
                  </button>
                  <a
                    href={`mailto:${therapist.email}`}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                  >
                    Send Email
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    value={editForm.email as string}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    value={editForm.phone as string}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">AHPRA Number</label>
                  <input
                    value={editForm.ahpraNumber as string}
                    onChange={(e) => setEditForm({ ...editForm, ahpraNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <a
                    href={`mailto:${therapist.email}`}
                    className="text-teal-500 hover:text-teal-400"
                  >
                    {therapist.email}
                  </a>
                </div>
                {therapist.phone && (
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <a
                      href={`tel:${therapist.phone}`}
                      className="text-white hover:text-gray-300"
                    >
                      {therapist.phone}
                    </a>
                  </div>
                )}
                {therapist.ahpraNumber && (
                  <div>
                    <p className="text-sm text-gray-400">AHPRA Number</p>
                    <p className="text-white">{therapist.ahpraNumber}</p>
                  </div>
                )}
                {therapist.lastContactedDate && (
                  <div>
                    <p className="text-sm text-gray-400">Last Contacted</p>
                    <p className="text-white">{therapist.lastContactedDate}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Specializations */}
          {therapist.specializations && therapist.specializations.length > 0 && !isEditing && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-2">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {therapist.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Areas */}
          {!isEditing && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Service Areas</p>
              <div className="flex flex-wrap gap-2">
                {therapist.areas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relationship & Notes */}
          {isEditing ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">How We Know Them</label>
                <input
                  value={editForm.relationship as string}
                  onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={editForm.notes as string}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          ) : (
            <>
              {therapist.relationship && (
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-1">How We Know Them</p>
                  <p className="text-white">{therapist.relationship}</p>
                </div>
              )}
              {therapist.notes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-300">{therapist.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div>
              <p className="text-2xl font-bold text-white">
                {therapist.participantHistory?.length || 0}
              </p>
              <p className="text-sm text-gray-400">Linked Participants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {therapist.totalAssessments || 0}
              </p>
              <p className="text-sm text-gray-400">Total Assessments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-500">
                {therapist.participantHistory?.filter(
                  (h) => h.relationshipType === "ongoing"
                ).length || 0}
              </p>
              <p className="text-sm text-gray-400">Ongoing Relationships</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {therapist.participantHistory?.filter(
                  (h) => h.relationshipType === "sda_assessment"
                ).length || 0}
              </p>
              <p className="text-sm text-gray-400">SDA Assessments</p>
            </div>
          </div>
        </div>

        {/* Participant History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Participant History</h2>
            <button
              onClick={() => setShowLinkModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              + Link Participant
            </button>
          </div>

          {!therapist.participantHistory || therapist.participantHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No participants linked yet. Click &quot;Link Participant&quot; to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {therapist.participantHistory.map((history) => (
                <div
                  key={history._id}
                  className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium">
                        {history.participant?.firstName} {history.participant?.lastName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${getRelationshipColor(
                          history.relationshipType
                        )}`}
                      >
                        {getRelationshipLabel(history.relationshipType)}
                      </span>
                    </div>
                    {history.property && (
                      <p className="text-gray-400 text-sm mt-1">
                        {history.property.propertyName || history.property.addressLine1}
                        {history.dwelling && ` - ${history.dwelling.dwellingName}`}
                      </p>
                    )}
                    {history.assessmentDate && (
                      <p className="text-gray-400 text-sm">Assessment: {history.assessmentDate}</p>
                    )}
                    {history.notes && (
                      <p className="text-gray-400 text-sm mt-1 italic">{history.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {history.participant && (
                      <Link
                        href={`/participants/${history.participant._id}`}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
                      >
                        View Participant
                      </Link>
                    )}
                    <button
                      onClick={() => handleUnlink(history._id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Communications History */}
        <div className="mt-6">
          <CommunicationsHistory
            stakeholderEntityType="occupational_therapist"
            stakeholderEntityId={otId}
          />
        </div>
      </main>

      {/* Link Participant Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Link Participant
            </h2>
            <form onSubmit={handleLinkParticipant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Participant *
                </label>
                <select
                  value={selectedParticipantId}
                  onChange={(e) =>
                    setSelectedParticipantId(e.target.value as Id<"participants">)
                  }
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="">Select a participant...</option>
                  {availableParticipants?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Relationship Type *
                </label>
                <select
                  value={relationshipType}
                  onChange={(e) =>
                    setRelationshipType(
                      e.target.value as "sda_assessment" | "ongoing" | "at_prescription" | "home_mod" | "inquiry"
                    )
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="sda_assessment">SDA Assessment</option>
                  <option value="ongoing">Ongoing - Regular OT services</option>
                  <option value="at_prescription">AT Prescription - Assistive technology</option>
                  <option value="home_mod">Home Modification</option>
                  <option value="inquiry">Inquiry - Not yet engaged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about this relationship..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  Link Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}
