"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";
import Link from "next/link";

type IncidentStatus =
  | "reported"
  | "under_investigation"
  | "resolved"
  | "closed";

export default function SILProviderIncidents() {
  const router = useRouter();
  const [silProviderId, setSilProviderId] = useState<Id<"silProviders"> | null>(
    null
  );
  const [providerName, setProviderName] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">(
    "all"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    if (user.role !== "sil_provider" || !user.silProviderId) {
      router.push("/dashboard");
      return;
    }

    setSilProviderId(user.silProviderId as Id<"silProviders">);
    setProviderName(user.providerName || "");
  }, [router]);

  const incidents = useQuery(
    api.silProviderPortal.getIncidents,
    silProviderId
      ? {
          silProviderId,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }
      : "skip"
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-600 text-white";
      case "major":
        return "bg-orange-600 text-white";
      case "moderate":
        return "bg-yellow-600 text-white";
      case "minor":
        return "bg-blue-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reported":
        return "bg-red-600/20 text-red-400";
      case "under_investigation":
        return "bg-yellow-600/20 text-yellow-400";
      case "resolved":
        return "bg-green-600/20 text-green-400";
      case "closed":
        return "bg-gray-600/20 text-gray-400";
      default:
        return "bg-gray-600/20 text-gray-400";
    }
  };

  if (!silProviderId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <SILProviderHeader currentPage="incidents" providerName={providerName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Incidents</h1>
            <p className="text-gray-400 mt-1">
              View and report incidents for your properties
            </p>
          </div>
          <Link
            href="/portal/incidents/new"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Report Incident
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4 overflow-x-auto">
            {[
              { value: "all", label: "All" },
              { value: "reported", label: "Reported" },
              { value: "under_investigation", label: "Under Investigation" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() =>
                  setStatusFilter(tab.value as IncidentStatus | "all")
                }
                className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  statusFilter === tab.value
                    ? "border-red-500 text-red-400"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Incidents List */}
        {!incidents ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading incidents...</div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <svg
              className="w-12 h-12 text-gray-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-400">No incidents found</p>
            <p className="text-gray-400 text-sm mt-1">
              {statusFilter !== "all"
                ? "Try changing the filter"
                : "All clear for now!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div
                key={incident._id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}
                      >
                        {incident.severity}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(incident.status)}`}
                      >
                        {incident.status.replace("_", " ")}
                      </span>
                      {incident.isNdisReportable && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-400">
                          NDIS Reportable
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium">{incident.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                      {incident.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400">
                      <span>{incident.incidentDate}</span>
                      <span>
                        {incident.property?.propertyName ||
                          incident.property?.addressLine1}
                      </span>
                      {incident.dwelling && (
                        <span>{incident.dwelling.dwellingName}</span>
                      )}
                      {incident.participant && (
                        <span>
                          {incident.participant.firstName}{" "}
                          {incident.participant.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/portal/incidents/${incident._id}`}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View Details &rarr;
                    </Link>
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
