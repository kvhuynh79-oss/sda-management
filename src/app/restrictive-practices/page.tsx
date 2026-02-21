"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import { formatDate } from "@/utils/format";

const STATUS_BADGES: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  expired: "bg-red-500/20 text-red-400",
  ceased: "bg-gray-500/20 text-gray-400",
};

const TYPE_BADGES: Record<string, string> = {
  environmental: "bg-blue-500/20 text-blue-400",
  chemical: "bg-purple-500/20 text-purple-400",
  mechanical: "bg-orange-500/20 text-orange-400",
  physical: "bg-red-500/20 text-red-400",
  seclusion: "bg-yellow-500/20 text-yellow-400",
};

export default function RestrictivePracticesPage() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const practices = useQuery(api.restrictivePractices.getAll, userId ? { userId } : "skip");
  const stats = useQuery(api.restrictivePractices.getDashboardStats, userId ? { userId } : "skip");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const filtered = useMemo(() => {
    if (!practices) return [];
    return practices.filter((p) => {
      if (filterType !== "all" && p.practiceType !== filterType) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          p.participantName.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.propertyAddress.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [practices, filterType, filterStatus, searchTerm]);

  if (!user) return null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Restrictive Practices Register</h1>
              <p className="mt-1 text-gray-400">
                NDIS Practice Standards compliance — register and monitor restrictive practices
              </p>
            </div>
            <Link
              href="/restrictive-practices/new"
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Record Practice
            </Link>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard title="Active" value={stats.activeCount} color="blue" />
              <StatCard title="Reviews Overdue" value={stats.reviewsOverdue} color="red" />
              <StatCard title="Auth. Expiring" value={stats.authorisationsExpiring} color="yellow" />
              <StatCard title="Unauthorised" value={stats.unauthorised} color="red" />
              <StatCard title="Unreported" value={stats.unreported} color="yellow" />
              <StatCard title="Total Records" value={stats.totalRecords} color="gray" />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search participant, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Filter by practice type"
            >
              <option value="all">All Types</option>
              <option value="environmental">Environmental</option>
              <option value="chemical">Chemical</option>
              <option value="mechanical">Mechanical</option>
              <option value="physical">Physical</option>
              <option value="seclusion">Seclusion</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="under_review">Under Review</option>
              <option value="expired">Expired</option>
              <option value="ceased">Ceased</option>
            </select>
          </div>

          {/* List */}
          {!practices ? (
            <LoadingScreen />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No restrictive practices found"
              description="No records match your current filters."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((practice) => {
                const today = new Date().toISOString().split("T")[0];
                const isOverdueReview = practice.nextReviewDate < today;
                return (
                  <Link
                    key={practice._id}
                    href={`/restrictive-practices/${practice._id}`}
                    className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700/80 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_BADGES[practice.practiceType]}`}>
                            {practice.practiceTypeLabel}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGES[practice.status]}`}>
                            {practice.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          {!practice.isAuthorised && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-600/30 text-red-300">
                              UNAUTHORISED
                            </span>
                          )}
                          {practice.ndisReportable && !practice.ndisReportedDate && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-600/30 text-orange-300">
                              NDIS UNREPORTED
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-medium">{practice.participantName}</h3>
                        <p className="text-sm text-gray-400 line-clamp-1">{practice.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{practice.propertyAddress}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-400">Next Review</div>
                        <div className={isOverdueReview ? "text-red-400 font-medium" : "text-white"}>
                          {formatDate(practice.nextReviewDate)}
                          {isOverdueReview && " (OVERDUE)"}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Auth. expires: {formatDate(practice.authorisationExpiry)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
