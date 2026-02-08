"use client";

import Link from "next/link";
import { CommunicationTypeBadge, ContactTypeBadge, DirectionBadge } from "./Badge";

interface CommunicationCardProps {
  communication: {
    _id: string;
    communicationType: "email" | "sms" | "phone_call" | "meeting" | "other";
    direction: "sent" | "received";
    communicationDate: string;
    communicationTime?: string;
    contactType: "ndia" | "support_coordinator" | "sil_provider" | "participant" | "family" | "plan_manager" | "ot" | "contractor" | "other";
    contactName: string;
    subject?: string;
    summary: string;
    attachmentFileName?: string;
    participant?: {
      firstName: string;
      lastName: string;
    } | null;
  };
  compact?: boolean;
}

// Icon for communication type
function CommunicationIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    email: "📧",
    sms: "💬",
    phone_call: "📞",
    meeting: "🤝",
    other: "📝",
  };
  return <span className="text-lg" aria-hidden="true">{icons[type] || icons.other}</span>;
}

export default function CommunicationCard({ communication, compact = false }: CommunicationCardProps) {
  if (compact) {
    return (
      <Link
        href={`/follow-ups/communications/${communication._id}`}
        className="block bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CommunicationIcon type={communication.communicationType} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <DirectionBadge direction={communication.direction} />
              <span className="text-gray-400 text-xs">{communication.communicationDate}</span>
            </div>
            <p className="text-white text-sm font-medium truncate">{communication.contactName}</p>
            <p className="text-gray-400 text-xs truncate">
              {communication.subject || communication.summary}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article
      className="bg-gray-800 rounded-lg p-4 sm:p-6 hover:bg-gray-700 transition-colors"
      role="listitem"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <CommunicationIcon type={communication.communicationType} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <DirectionBadge direction={communication.direction} />
              <CommunicationTypeBadge type={communication.communicationType} />
              <ContactTypeBadge contactType={communication.contactType} />
            </div>

            {/* Contact Name */}
            <h3 className="text-lg font-semibold text-white">{communication.contactName}</h3>

            {/* Subject */}
            {communication.subject && (
              <p className="text-gray-300 text-sm mt-1 font-medium">{communication.subject}</p>
            )}

            {/* Summary */}
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{communication.summary}</p>

            {/* Attachment indicator */}
            {communication.attachmentFileName && (
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                <span>{communication.attachmentFileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/follow-ups/communications/${communication._id}`}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            View
          </Link>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-gray-400 mt-3 pt-3 border-t border-gray-700">
        <div>
          <span className="text-gray-400">Date:</span>{" "}
          {communication.communicationDate}
          {communication.communicationTime && ` at ${communication.communicationTime}`}
        </div>
        {communication.participant && (
          <div>
            <span className="text-gray-400">Participant:</span>{" "}
            {communication.participant.firstName} {communication.participant.lastName}
          </div>
        )}
      </div>
    </article>
  );
}
