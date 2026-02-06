"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";

export default function SILProviderProperties() {
  const router = useRouter();
  const [silProviderId, setSilProviderId] = useState<Id<"silProviders"> | null>(
    null
  );
  const [providerName, setProviderName] = useState<string>("");

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

  const dashboard = useQuery(
    api.silProviderPortal.getDashboard,
    silProviderId ? { silProviderId } : "skip"
  );

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case "full":
        return (
          <span className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400">
            Full Access
          </span>
        );
      case "incidents_only":
        return (
          <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400">
            Incidents Only
          </span>
        );
      case "maintenance_only":
        return (
          <span className="text-xs px-2 py-1 rounded bg-yellow-600/20 text-yellow-400">
            Maintenance Only
          </span>
        );
      case "view_only":
        return (
          <span className="text-xs px-2 py-1 rounded bg-gray-600/20 text-gray-400">
            View Only
          </span>
        );
      default:
        return null;
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
      <SILProviderHeader currentPage="properties" providerName={providerName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Your Properties</h1>
          <p className="text-gray-400 mt-1">
            Properties you have been allocated to manage
          </p>
        </div>

        {/* Properties Grid */}
        {!dashboard ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Loading properties...</div>
          </div>
        ) : dashboard.properties.length === 0 ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-gray-400">No properties allocated yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Contact your administrator to get property access
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard.properties.map((prop) => (
              <div
                key={prop._id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              >
                {/* Property Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-medium">
                      {prop.propertyName || prop.addressLine1}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    {prop.addressLine1}
                    <br />
                    {prop.suburb} {prop.state} {prop.postcode}
                  </p>
                </div>

                {/* Dwellings */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">
                    Dwellings ({prop.dwellings.length})
                  </h4>
                  <div className="space-y-3">
                    {prop.dwellings.map((dwelling) => {
                      const dwellingParticipants = prop.participants.filter(
                        (p) => p.dwellingId === dwelling._id
                      );
                      return (
                        <div
                          key={dwelling._id}
                          className="bg-gray-700/50 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">
                              {dwelling.dwellingName}
                            </span>
                            <div className="flex items-center gap-2">
                              {getAccessLevelBadge(dwelling.accessLevel)}
                              <span className="text-xs text-gray-400">
                                {dwelling.currentOccupancy}/
                                {dwelling.maxParticipants}
                              </span>
                            </div>
                          </div>
                          {dwellingParticipants.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {dwellingParticipants.map((participant) => (
                                <div
                                  key={participant._id}
                                  className="flex items-center gap-2 text-sm text-gray-400"
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  {participant.firstName} {participant.lastName}
                                </div>
                              ))}
                            </div>
                          )}
                          {dwellingParticipants.length === 0 && (
                            <div className="mt-2 text-sm text-gray-400">
                              No participants
                            </div>
                          )}
                        </div>
                      );
                    })}
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
