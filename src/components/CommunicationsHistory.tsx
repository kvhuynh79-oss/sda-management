"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";

type StakeholderEntityType = "support_coordinator" | "sil_provider" | "occupational_therapist" | "contractor" | "participant";

interface CommunicationsHistoryProps {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
  limit?: number;
}

const TYPE_ICONS: Record<string, string> = {
  phone_call: "📞",
  email: "📧",
  sms: "💬",
  meeting: "🤝",
  other: "📋",
};

const DIRECTION_COLORS: Record<string, string> = {
  sent: "bg-blue-900/50 text-blue-300",
  received: "bg-green-900/50 text-green-300",
};

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: days > 365 ? "numeric" : undefined,
  });
}

export default function CommunicationsHistory({
  participantId,
  propertyId,
  stakeholderEntityType,
  stakeholderEntityId,
  limit = 10,
}: CommunicationsHistoryProps) {
  // Conditionally call the right query based on props
  const byParticipant = useQuery(
    api.communications.getByParticipant,
    participantId ? { participantId } : "skip"
  );

  const byProperty = useQuery(
    api.communications.getByProperty,
    propertyId ? { propertyId } : "skip"
  );

  const byStakeholder = useQuery(
    api.communications.getByStakeholder,
    stakeholderEntityType && stakeholderEntityId
      ? { stakeholderEntityType, stakeholderEntityId, limit }
      : "skip"
  );

  // Determine which data source to use
  const communications = participantId
    ? byParticipant
    : propertyId
      ? byProperty
      : byStakeholder;

  const isLoading = communications === undefined;

  // Limit results for display
  const displayComms = communications
    ? communications.slice(0, limit)
    : [];

  const totalCount = communications?.length || 0;

  // Build the "Add Entry" link with pre-fill params
  const logCommLink = buildAddEntryLink({
    participantId,
    propertyId,
    stakeholderEntityType,
    stakeholderEntityId,
  });

  return (
    <section aria-labelledby="comms-history-heading" className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 id="comms-history-heading" className="text-lg font-semibold text-white">
          Communications
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({totalCount})
            </span>
          )}
        </h2>
        <Link
          href={logCommLink}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          + Add Entry
        </Link>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
              <div className="w-8 h-8 bg-gray-600 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600 rounded w-3/4" />
                <div className="h-3 bg-gray-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayComms.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-3">No communications recorded yet</p>
          <Link
            href={logCommLink}
            className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Add Entry
          </Link>
        </div>
      )}

      {/* Communications list */}
      {!isLoading && displayComms.length > 0 && (
        <div className="space-y-2" role="list">
          {displayComms.map((comm) => (
            <Link
              key={comm._id}
              href={`/follow-ups/communications/${comm._id}`}
              className="flex items-start gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors group"
              role="listitem"
            >
              {/* Type icon */}
              <span className="text-lg mt-0.5" aria-hidden="true">
                {TYPE_ICONS[comm.communicationType] || "📋"}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium truncate">
                    {comm.contactName}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${DIRECTION_COLORS[comm.direction] || "bg-gray-600 text-gray-300"}`}>
                    {comm.direction === "sent" ? "Sent" : "Received"}
                  </span>
                  {comm.complianceCategory && comm.complianceCategory !== "none" && comm.complianceCategory !== "routine" && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-300">
                      {comm.complianceCategory.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {comm.subject && (
                  <p className="text-gray-300 text-sm truncate">{comm.subject}</p>
                )}

                <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">
                  {comm.summary}
                </p>
              </div>

              {/* Date */}
              <span className="text-gray-400 text-xs whitespace-nowrap mt-1">
                {formatRelativeDate(comm.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* View all link */}
      {totalCount > limit && (
        <div className="mt-3 text-center">
          <Link
            href={buildViewAllLink({ participantId, propertyId, stakeholderEntityType, stakeholderEntityId })}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View all {totalCount} communications
          </Link>
        </div>
      )}
    </section>
  );
}

// Build URL for "Add Entry" with pre-fill params
function buildAddEntryLink(params: {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
}): string {
  const searchParams = new URLSearchParams();
  if (params.participantId) searchParams.set("participantId", params.participantId);
  if (params.propertyId) searchParams.set("propertyId", params.propertyId);
  if (params.stakeholderEntityType) searchParams.set("contactType", params.stakeholderEntityType);
  if (params.stakeholderEntityId) {
    searchParams.set("stakeholderType", params.stakeholderEntityType || "");
    searchParams.set("stakeholderId", params.stakeholderEntityId);
  }

  const qs = searchParams.toString();
  return `/follow-ups/communications/new${qs ? `?${qs}` : ""}`;
}

// Build URL for "View all" link
function buildViewAllLink(params: {
  participantId?: Id<"participants">;
  propertyId?: Id<"properties">;
  stakeholderEntityType?: StakeholderEntityType;
  stakeholderEntityId?: string;
}): string {
  // Navigate to the follow-ups page - the user can filter there
  return "/follow-ups";
}
