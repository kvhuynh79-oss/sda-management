"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, StatCard } from "@/components/ui";

const STATUS_CELL_COLORS: Record<string, string> = {
  current: "bg-green-500/20 text-green-400",
  expiring: "bg-yellow-500/20 text-yellow-400",
  expired: "bg-red-500/20 text-red-400",
  missing: "bg-gray-700/50 text-gray-500",
  not_started: "bg-gray-700/50 text-gray-500",
  in_progress: "bg-blue-500/20 text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  current: "Current",
  expiring: "Expiring",
  expired: "Expired",
  missing: "Missing",
  not_started: "Not Started",
  in_progress: "In Progress",
};

export default function TrainingMatrixPage() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  const userId = user ? (user.id as Id<"users">) : undefined;
  const matrixData = useQuery(api.staffTraining.getTrainingMatrix, userId ? { userId } : "skip");
  const stats = useQuery(api.staffTraining.getDashboardStats, userId ? { userId } : "skip");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  if (!user) return null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <Link href="/compliance/staff" className="text-teal-400 hover:text-teal-300 text-sm mb-2 inline-block">
                &larr; Back to Staff Files
              </Link>
              <h1 className="text-2xl font-bold text-white">Staff Training Matrix</h1>
              <p className="mt-1 text-gray-400">
                Mandatory training compliance across all staff members
              </p>
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard title="Staff Compliance" value={`${stats.compliancePercentage}%`} color="blue" />
              <StatCard title="Compliant Staff" value={`${stats.compliantStaff}/${stats.staffCount}`} color="green" />
              <StatCard title="Expiring (30d)" value={stats.expiring} color="yellow" />
              <StatCard title="Expired" value={stats.expired} color="red" />
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-6">
            {Object.entries(STATUS_CELL_COLORS).map(([key, classes]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span className={`w-3 h-3 rounded-sm ${classes.split(" ")[0]}`} />
                <span className="text-gray-400">{STATUS_LABELS[key]}</span>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          {!matrixData ? (
            <LoadingScreen />
          ) : matrixData.matrix.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">No staff members found. Add staff via the Staff Files page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium sticky left-0 bg-gray-900 z-10">Staff Member</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                    {matrixData.mandatoryCategories.map((cat) => (
                      <th key={cat.key} className="text-center py-3 px-3 text-gray-400 font-medium whitespace-nowrap">
                        {cat.label}
                      </th>
                    ))}
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.matrix.map((row) => (
                    <tr key={row.staffId} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-white font-medium sticky left-0 bg-gray-900 z-10">
                        {row.staffName}
                      </td>
                      <td className="py-3 px-4 text-gray-400 capitalize">{row.role.replace("_", " ")}</td>
                      {matrixData.mandatoryCategories.map((cat) => {
                        const cell = row.categories[cat.key];
                        const cellClass = STATUS_CELL_COLORS[cell?.status || "missing"] || STATUS_CELL_COLORS.missing;
                        return (
                          <td key={cat.key} className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${cellClass}`}>
                              {STATUS_LABELS[cell?.status || "missing"]}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/compliance/staff/${row.staffId}/training`}
                          className="text-teal-400 hover:text-teal-300 text-xs"
                        >
                          View / Add
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
