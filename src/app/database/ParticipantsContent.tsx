"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { LoadingScreen, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate, formatStatus } from "@/utils/format";
import { Id } from "../../../convex/_generated/dataModel";

export default function ParticipantsContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserId(user.id as Id<"users">);
    }
  }, []);

  const participants = useQuery(
    api.participants.getAll,
    userId ? { userId } : "skip"
  );

  // Memoize filtered participants to avoid recalculating on every render
  const filteredParticipants = useMemo(() => {
    if (!participants) return [];

    return participants.filter((p) => {
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesSearch =
        searchTerm === "" ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ndisNumber.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [participants, statusFilter, searchTerm]);

  const hasFilters = searchTerm !== "" || statusFilter !== "all";

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-400 text-sm">Manage NDIS participants and their plans</p>
        </div>
        <Link
          href="/participants/new"
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          + Add Participant
        </Link>
      </div>

      {/* Filters */}
      <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
        <legend className="sr-only">Filter participants</legend>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="search" className="sr-only">
              Search participants
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by name or NDIS number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-describedby="search-hint"
            />
            <span id="search-hint" className="sr-only">
              Search by participant name or NDIS number
            </span>
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_move_in">Pending Move-in</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Results count */}
      {participants !== undefined && (
        <p className="text-sm text-gray-400 mb-4" aria-live="polite">
          Showing {filteredParticipants.length} of {participants.length}{" "}
          participants
          {hasFilters && " (filtered)"}
        </p>
      )}

      {/* Participants List */}
      {participants === undefined ? (
        <LoadingScreen fullScreen={false} message="Loading participants..." />
      ) : filteredParticipants.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No participants match your filters"
              : "No participants yet"
          }
          description={
            hasFilters
              ? "Try adjusting your search or filters"
              : "Get started by adding your first NDIS participant"
          }
          icon={<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
          action={
            !hasFilters
              ? {
                  label: "+ Add Your First Participant",
                  href: "/participants/new",
                }
              : undefined
          }
          isFiltered={hasFilters}
        />
      ) : (
        <div className="grid gap-4" role="list" aria-label="Participants list">
          {filteredParticipants.map((participant) => (
            <ParticipantCard key={participant._id} participant={participant} />
          ))}
        </div>
      )}
    </>
  );
}

function ParticipantCard({ participant }: { participant: any }) {
  const statusColor = useMemo(() => {
    switch (participant.status) {
      case "active":
        return "bg-green-600";
      case "inactive":
        return "bg-gray-600";
      case "pending_move_in":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  }, [participant.status]);

  const planStatus = useMemo(() => {
    if (!participant.currentPlan) return { text: "No Plan", color: "text-red-400" };

    const endDate = new Date(participant.currentPlan.planEndDate);
    const today = new Date();
    const daysLeft = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) return { text: "Plan Expired", color: "text-red-400" };
    if (daysLeft <= 30)
      return { text: `Expires in ${daysLeft} days`, color: "text-yellow-400" };
    if (daysLeft <= 60)
      return { text: `Expires in ${daysLeft} days`, color: "text-orange-400" };
    return { text: "Plan Active", color: "text-green-400" };
  }, [participant.currentPlan]);

  const formatFundingType = (type: string) => {
    switch (type) {
      case "ndia_managed":
        return "NDIA Managed";
      case "plan_managed":
        return "Plan Managed";
      case "self_managed":
        return "Self Managed";
      default:
        return type;
    }
  };

  return (
    <Link
      href={`/participants/${participant._id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
      role="listitem"
    >
      <article className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/80 transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold text-lg"
              aria-hidden="true"
            >
              {participant.firstName[0]}
              {participant.lastName[0]}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                {participant.firstName} {participant.lastName}
              </h2>
              <p className="text-gray-400 text-sm">
                NDIS: {participant.ndisNumber}
              </p>
              {participant.property && (
                <p className="text-gray-400 text-sm mt-1">
                  {participant.dwelling?.dwellingName} at{" "}
                  {participant.property.propertyName ||
                    participant.property.addressLine1}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm ${planStatus.color}`}>
              {planStatus.text}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs text-white ${statusColor}`}
            >
              {formatStatus(participant.status)}
            </span>
          </div>
        </div>

        {participant.currentPlan && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Funding Type</p>
              <p className="text-white text-sm">
                {formatFundingType(participant.currentPlan.fundingManagementType)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Monthly Amount</p>
              <p className="text-white text-sm">
                {formatCurrency(participant.currentPlan.monthlySdaAmount || 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Annual Budget</p>
              <p className="text-white text-sm">
                {formatCurrency(participant.currentPlan.annualSdaBudget)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Plan End</p>
              <p className="text-white text-sm">
                {formatDate(participant.currentPlan.planEndDate)}
              </p>
            </div>
          </div>
        )}
      </article>
    </Link>
  );
}
