"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import Link from "next/link";

export default function SupportCoordinatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const coordinatorId = params.id as Id<"supportCoordinators">;

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<Id<"participants"> | "">("");
  const [relationshipType, setRelationshipType] = useState<"referred" | "current" | "past" | "inquiry">("current");
  const [linkNotes, setLinkNotes] = useState("");

  const coordinator = useQuery(api.supportCoordinators.getById, { coordinatorId });
  const allParticipants = useQuery(api.participants.getAll);
  const linkParticipant = useMutation(api.supportCoordinators.linkParticipant);
  const unlinkParticipant = useMutation(api.supportCoordinators.unlinkParticipant);
  const updateCoordinator = useMutation(api.supportCoordinators.update);

  if (coordinator === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (coordinator === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">Support coordinator not found</p>
            <Link
              href="/database/support-coordinators"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
    coordinator.participantHistory?.map((h) => h.participantId) || []
  );
  const availableParticipants = allParticipants?.filter(
    (p) => !linkedParticipantIds.has(p._id)
  );

  const handleLinkParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) return;

    await linkParticipant({
      supportCoordinatorId: coordinatorId,
      participantId: selectedParticipantId as Id<"participants">,
      relationshipType,
      startDate: new Date().toISOString().split("T")[0],
      notes: linkNotes || undefined,
    });

    setShowLinkModal(false);
    setSelectedParticipantId("");
    setRelationshipType("current");
    setLinkNotes("");
  };

  const handleUnlink = async (linkId: Id<"supportCoordinatorParticipants">) => {
    if (confirm("Remove this participant link? (History will be preserved in notes)")) {
      await unlinkParticipant({ linkId });
    }
  };

  const handleMarkContacted = async () => {
    const today = new Date().toISOString().split("T")[0];
    await updateCoordinator({
      coordinatorId,
      lastContactedDate: today,
    });
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "referred":
        return "bg-green-500/20 text-green-400";
      case "current":
        return "bg-blue-500/20 text-blue-400";
      case "past":
        return "bg-gray-500/20 text-gray-400";
      case "inquiry":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/database/support-coordinators"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Support Coordinators
          </Link>
        </div>

        {/* Coordinator Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {coordinator.firstName} {coordinator.lastName}
                </h1>
                <span
                  className={`px-2 py-0.5 text-sm rounded-full ${
                    coordinator.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {coordinator.status}
                </span>
              </div>
              {coordinator.organization && (
                <p className="text-gray-400 mt-1">{coordinator.organization}</p>
              )}
              {coordinator.rating && (
                <div className="flex items-center text-yellow-400 mt-2">
                  {"★".repeat(coordinator.rating)}
                  {"☆".repeat(5 - coordinator.rating)}
                  <span className="text-gray-400 ml-2 text-sm">
                    ({coordinator.rating}/5)
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMarkContacted}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Mark Contacted
              </button>
              <a
                href={`mailto:${coordinator.email}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Send Email
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <a
                href={`mailto:${coordinator.email}`}
                className="text-blue-400 hover:text-blue-300"
              >
                {coordinator.email}
              </a>
            </div>
            {coordinator.phone && (
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <a
                  href={`tel:${coordinator.phone}`}
                  className="text-white hover:text-gray-300"
                >
                  {coordinator.phone}
                </a>
              </div>
            )}
            {coordinator.lastContactedDate && (
              <div>
                <p className="text-sm text-gray-400">Last Contacted</p>
                <p className="text-white">{coordinator.lastContactedDate}</p>
              </div>
            )}
          </div>

          {/* Areas */}
          <div className="mt-6">
            <p className="text-sm text-gray-400 mb-2">Areas Covered</p>
            <div className="flex flex-wrap gap-2">
              {coordinator.areas.map((area) => (
                <span
                  key={area}
                  className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Relationship & Notes */}
          {coordinator.relationship && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-1">How We Know Them</p>
              <p className="text-white">{coordinator.relationship}</p>
            </div>
          )}
          {coordinator.notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-1">Notes</p>
              <p className="text-gray-300">{coordinator.notes}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div>
              <p className="text-2xl font-bold text-white">
                {coordinator.participantHistory?.length || 0}
              </p>
              <p className="text-sm text-gray-400">Linked Participants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {coordinator.totalReferrals || 0}
              </p>
              <p className="text-sm text-gray-400">Referrals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {coordinator.participantHistory?.filter(
                  (h) => h.relationshipType === "current"
                ).length || 0}
              </p>
              <p className="text-sm text-gray-400">Current Relationships</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">
                {coordinator.participantHistory?.filter(
                  (h) => h.relationshipType === "past"
                ).length || 0}
              </p>
              <p className="text-sm text-gray-400">Past Relationships</p>
            </div>
          </div>
        </div>

        {/* Participant History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Participant History</h2>
            <button
              onClick={() => setShowLinkModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + Link Participant
            </button>
          </div>

          {!coordinator.participantHistory || coordinator.participantHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No participants linked yet. Click "Link Participant" to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {coordinator.participantHistory.map((history) => (
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
                        {history.relationshipType}
                      </span>
                    </div>
                    {history.property && (
                      <p className="text-gray-400 text-sm mt-1">
                        {history.property.propertyName || history.property.addressLine1}
                        {history.dwelling && ` - ${history.dwelling.dwellingName}`}
                      </p>
                    )}
                    {history.startDate && (
                      <p className="text-gray-500 text-sm">Since: {history.startDate}</p>
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      e.target.value as "referred" | "current" | "past" | "inquiry"
                    )
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current">Current - Currently their coordinator</option>
                  <option value="referred">Referred - They referred this participant</option>
                  <option value="past">Past - Was their coordinator previously</option>
                  <option value="inquiry">Inquiry - Made inquiry but didn't proceed</option>
                </select>
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Link Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
