"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function IncidentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const incidents = useQuery(api.incidents.getAll, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-600",
      major: "bg-orange-600",
      moderate: "bg-yellow-600",
      minor: "bg-gray-600",
    };
    return colors[severity] || "bg-gray-600";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: "bg-red-600",
      under_investigation: "bg-yellow-600",
      resolved: "bg-green-600",
      closed: "bg-gray-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const formatIncidentType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="incidents" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Reports</h1>
            <p className="text-gray-400 mt-1">Track and manage incident reports</p>
          </div>
          <Link
            href="/incidents/new"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            + Report Incident
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex gap-4 items-center">
            <span className="text-gray-400">Filter by status:</span>
            <div className="flex gap-2">
              {["all", "reported", "under_investigation", "resolved", "closed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {status === "all" ? "All" : status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Incidents List */}
        {incidents === undefined ? (
          <div className="text-center py-12 text-gray-400">Loading incidents...</div>
        ) : incidents.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-400 mb-4">No incidents reported</p>
            <Link
              href="/incidents/new"
              className="text-blue-400 hover:text-blue-300"
            >
              Report an incident
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div
                key={incident._id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs text-white ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(incident.status)}`}>
                        {incident.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {formatIncidentType(incident.incidentType)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">{incident.description}</p>
                  </div>
                  <Link
                    href={`/incidents/${incident._id}`}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    View Details
                  </Link>
                </div>

                <div className="flex gap-6 text-sm text-gray-400">
                  <div>
                    <span className="text-gray-500">Property:</span>{" "}
                    {incident.property?.propertyName || incident.property?.addressLine1}
                  </div>
                  {incident.participant && (
                    <div>
                      <span className="text-gray-500">Participant:</span>{" "}
                      {incident.participant.firstName} {incident.participant.lastName}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Date:</span> {incident.incidentDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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
