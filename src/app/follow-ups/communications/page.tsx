"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, CommunicationCard } from "@/components/ui";

export default function CommunicationsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const communications = useQuery(api.communications.getAll);

  // Filtered communications
  const filteredCommunications = useMemo(() => {
    if (!communications) return [];

    return communications.filter((comm) => {
      // Type filter
      if (typeFilter !== "all" && comm.communicationType !== typeFilter) {
        return false;
      }

      // Contact type filter
      if (contactTypeFilter !== "all" && comm.contactType !== contactTypeFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesContact = comm.contactName.toLowerCase().includes(search);
        const matchesSubject = comm.subject?.toLowerCase().includes(search);
        const matchesSummary = comm.summary.toLowerCase().includes(search);
        const matchesParticipant = comm.participant
          ? `${comm.participant.firstName} ${comm.participant.lastName}`.toLowerCase().includes(search)
          : false;
        if (!matchesContact && !matchesSubject && !matchesSummary && !matchesParticipant) {
          return false;
        }
      }

      return true;
    });
  }, [communications, typeFilter, contactTypeFilter, searchTerm]);

  const hasFilters = typeFilter !== "all" || contactTypeFilter !== "all" || searchTerm !== "";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="communications" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <nav className="text-sm mb-2">
                <Link href="/follow-ups" className="text-gray-400 hover:text-white">
                  Follow-ups
                </Link>
                <span className="text-gray-600 mx-2">/</span>
                <span className="text-white">Communications</span>
              </nav>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Communication Log</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                All logged communications
              </p>
            </div>
            <Link
              href="/follow-ups/communications/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              + Log Communication
            </Link>
          </div>

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter communications</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm text-gray-400 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search communications..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label htmlFor="type-filter" className="block text-sm text-gray-400 mb-1">
                  Type
                </label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="meeting">Meeting</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Contact Type Filter */}
              <div>
                <label htmlFor="contact-type-filter" className="block text-sm text-gray-400 mb-1">
                  Contact Type
                </label>
                <select
                  id="contact-type-filter"
                  value={contactTypeFilter}
                  onChange={(e) => setContactTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Contact Types</option>
                  <option value="ndia">NDIA</option>
                  <option value="support_coordinator">Support Coordinator</option>
                  <option value="plan_manager">Plan Manager</option>
                  <option value="sil_provider">SIL Provider</option>
                  <option value="participant">Participant</option>
                  <option value="family">Family</option>
                  <option value="ot">OT</option>
                  <option value="contractor">Contractor</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {communications !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {filteredCommunications.length} communication{filteredCommunications.length !== 1 ? "s" : ""}
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Communications List */}
          {communications === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading communications..." />
          ) : filteredCommunications.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No communications match your filters" : "No communications logged"}
              description={
                hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "Log your first communication to start tracking"
              }
              icon={<span className="text-6xl">📞</span>}
              action={
                !hasFilters
                  ? {
                      label: "+ Log Communication",
                      href: "/follow-ups/communications/new",
                    }
                  : undefined
              }
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Communications list">
              {filteredCommunications.map((comm) => (
                <CommunicationCard
                  key={comm._id}
                  communication={comm as any}
                  compact={false}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
