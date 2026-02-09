"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, CommunicationCard } from "@/components/ui";
import { Id } from "../../../../convex/_generated/dataModel";

export default function CommunicationsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const communications = useQuery(api.communications.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

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
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-white">Communications</span>
              </nav>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Communication Log</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                All logged communications
              </p>
            </div>
            <Link
              href="/follow-ups/communications/new"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
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
              icon={<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>}
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
