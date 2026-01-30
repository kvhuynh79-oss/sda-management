"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

export default function InspectionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const inspections = useQuery(api.inspections.getInspections, {});
  const templates = useQuery(api.inspections.getTemplates, {});
  const seedBLSTemplate = useMutation(api.inspections.seedBLSTemplate);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    // If user ID is missing, clear session and redirect to login
    if (!userId) {
      localStorage.removeItem("sda_user");
      router.push("/login");
      return;
    }

    setUser({
      id: userId,
      role: parsed.role,
    });
  }, [router]);

  const handleSeedTemplate = async () => {
    if (!user || !user.id) return;
    try {
      await seedBLSTemplate({ createdBy: user.id as Id<"users"> });
      alert("BLS Template created successfully!");
    } catch (error) {
      console.error("Error seeding template:", error);
      alert("Error creating template. It may already exist.");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const filteredInspections = inspections?.filter((inspection) => {
    if (statusFilter === "all") return true;
    return inspection.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-600";
      case "in_progress":
        return "bg-yellow-600";
      case "completed":
        return "bg-green-600";
      case "cancelled":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  const getProgressColor = (passed: number, failed: number, total: number) => {
    if (total === 0) return "bg-gray-600";
    const passRate = passed / total;
    if (failed > 0) return "bg-yellow-600";
    if (passRate === 1) return "bg-green-600";
    return "bg-blue-600";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="inspections" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Property Inspections
            </h1>
            <p className="text-gray-400 mt-1">
              Conduct and track property inspection checklists
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/inspections/templates"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              Manage Templates
            </Link>
            <Link
              href="/inspections/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              + New Inspection
            </Link>
          </div>
        </div>

        {/* Template Check */}
        {templates && templates.length === 0 && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-yellow-400 font-medium">
                  No Inspection Templates Found
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Create the BLS Property Inspection template to get started.
                </p>
              </div>
              <button
                onClick={handleSeedTemplate}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
              >
                Create BLS Template
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Inspections"
            value={inspections?.length || 0}
            color="blue"
          />
          <StatCard
            label="Scheduled"
            value={
              inspections?.filter((i) => i.status === "scheduled").length || 0
            }
            color="blue"
          />
          <StatCard
            label="In Progress"
            value={
              inspections?.filter((i) => i.status === "in_progress").length || 0
            }
            color="yellow"
          />
          <StatCard
            label="Completed"
            value={
              inspections?.filter((i) => i.status === "completed").length || 0
            }
            color="green"
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("scheduled")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === "scheduled"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === "in_progress"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Inspections List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {inspections === undefined ? (
            <div className="p-8 text-center text-gray-400">
              Loading inspections...
            </div>
          ) : filteredInspections && filteredInspections.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {filteredInspections.map((inspection) => (
                <Link
                  key={inspection._id}
                  href={`/inspections/${inspection._id}`}
                  className="block p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium">
                          {inspection.property?.propertyName ||
                            inspection.property?.addressLine1 ||
                            "Unknown Property"}
                        </h3>
                        {inspection.dwelling && (
                          <span className="text-gray-500 text-sm">
                            - {inspection.dwelling.dwellingName}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <span>{inspection.template?.name || "Unknown Template"}</span>
                        <span className="text-gray-600">|</span>
                        <span>
                          {inspection.inspector
                            ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                            : "Unassigned"}
                        </span>
                        <span className="text-gray-600">|</span>
                        <span>{inspection.scheduledDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress */}
                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">
                          {inspection.completedItems}/{inspection.totalItems} items
                        </div>
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(
                              inspection.passedItems,
                              inspection.failedItems,
                              inspection.totalItems
                            )}`}
                            style={{
                              width: `${
                                inspection.totalItems > 0
                                  ? (inspection.completedItems /
                                      inspection.totalItems) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor(
                          inspection.status
                        )}`}
                      >
                        {inspection.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-500 text-5xl mb-4">📋</div>
              <p className="text-gray-400 mb-4">No inspections found</p>
              <Link
                href="/inspections/new"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create First Inspection
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
