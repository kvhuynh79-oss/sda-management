"use client";

import { StatCard } from "../ui/StatCard";
import type { ViewMode } from "./ViewToggle";

interface StatsHeaderProps {
  stats: {
    totalThreads: number;
    unreadThreads: number;
    requiresAction: number;
    recentActivity: number;
  } | undefined;
  onStatClick?: (view: ViewMode, filter?: string) => void;
}

function StatSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-6 animate-pulse" aria-hidden="true">
      <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
      <div className="h-8 bg-gray-700 rounded w-16 mt-1" />
    </div>
  );
}

export function StatsHeader({ stats, onStatClick }: StatsHeaderProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading communication statistics">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        onClick={() => onStatClick?.("thread")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStatClick?.("thread"); } }}
        role={onStatClick ? "button" : undefined}
        tabIndex={onStatClick ? 0 : undefined}
        aria-label={`Total Threads: ${stats.totalThreads}. Click to view all threads.`}
        className={`${onStatClick ? "cursor-pointer" : ""} rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
      >
        <StatCard
          title="Total Threads"
          value={stats.totalThreads}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
      </div>
      <div
        onClick={() => onStatClick?.("thread", "unread")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStatClick?.("thread", "unread"); } }}
        role={onStatClick ? "button" : undefined}
        tabIndex={onStatClick ? 0 : undefined}
        aria-label={`Unread: ${stats.unreadThreads}. Click to view unread threads.`}
        className={`${onStatClick ? "cursor-pointer" : ""} rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
      >
        <StatCard
          title="Unread"
          value={stats.unreadThreads}
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>
      <div
        onClick={() => onStatClick?.("thread", "action")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStatClick?.("thread", "action"); } }}
        role={onStatClick ? "button" : undefined}
        tabIndex={onStatClick ? 0 : undefined}
        aria-label={`Requires Action: ${stats.requiresAction}. Click to view threads requiring action.`}
        className={`${onStatClick ? "cursor-pointer" : ""} rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
      >
        <StatCard
          title="Requires Action"
          value={stats.requiresAction}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>
      <div
        onClick={() => onStatClick?.("timeline")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStatClick?.("timeline"); } }}
        role={onStatClick ? "button" : undefined}
        tabIndex={onStatClick ? 0 : undefined}
        aria-label={`Recent 24h Activity: ${stats.recentActivity}. Click to view timeline.`}
        className={`${onStatClick ? "cursor-pointer" : ""} rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600`}
      >
        <StatCard
          title="Recent 24h Activity"
          value={stats.recentActivity}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

export default StatsHeader;
