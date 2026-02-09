"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";
import Link from "next/link";

export default function SILProviderDashboard() {
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

  if (!silProviderId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <SILProviderHeader currentPage="dashboard" providerName={providerName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 mt-1">
            Manage incidents and maintenance for your allocated properties
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Allocated Properties</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {dashboard?.stats.totalProperties ?? "-"}
                </p>
              </div>
              <div className="bg-purple-600/20 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-400"
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
              </div>
            </div>
          </div>

          <Link href="/portal/incidents" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Open Incidents</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.stats.openIncidents ?? "-"}
                  </p>
                </div>
                <div className="bg-red-600/20 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Click to view &rarr;</p>
            </div>
          </Link>

          <Link href="/portal/maintenance" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Open Maintenance</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.stats.openMaintenance ?? "-"}
                  </p>
                </div>
                <div className="bg-yellow-600/20 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">Click to view &rarr;</p>
            </div>
          </Link>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Vacant Spots</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {dashboard?.stats.totalVacantSpots ?? "-"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  in {dashboard?.stats.vacantDwellings ?? 0} dwelling
                  {(dashboard?.stats.vacantDwellings ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="bg-green-600/20 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/portal/incidents/new"
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-500 transition-colors text-center"
            >
              <div className="bg-red-600/20 p-3 rounded-lg inline-block mb-2">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">Report Incident</p>
            </Link>

            <Link
              href="/portal/maintenance/new"
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-yellow-500 transition-colors text-center"
            >
              <div className="bg-yellow-600/20 p-3 rounded-lg inline-block mb-2">
                <svg
                  className="w-6 h-6 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">
                Request Maintenance
              </p>
            </Link>

            <Link
              href="/portal/incidents"
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-teal-600 transition-colors text-center"
            >
              <div className="bg-teal-700/20 p-3 rounded-lg inline-block mb-2">
                <svg
                  className="w-6 h-6 text-teal-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-white text-sm font-medium">View Incidents</p>
            </Link>

            <Link
              href="/portal/properties"
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors text-center"
            >
              <div className="bg-purple-600/20 p-3 rounded-lg inline-block mb-2">
                <svg
                  className="w-6 h-6 text-purple-400"
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
              </div>
              <p className="text-white text-sm font-medium">View Properties</p>
            </Link>
          </div>
        </div>

        {/* Vacancies Section */}
        {dashboard?.vacancies && dashboard.vacancies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              Current Vacancies
            </h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-300 px-4 py-3">
                      Property
                    </th>
                    <th className="text-left text-sm font-medium text-gray-300 px-4 py-3">
                      Dwelling
                    </th>
                    <th className="text-center text-sm font-medium text-gray-300 px-4 py-3">
                      Occupancy
                    </th>
                    <th className="text-center text-sm font-medium text-gray-300 px-4 py-3">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {dashboard.vacancies.map((vacancy) => (
                    <tr
                      key={`${vacancy.propertyId}-${vacancy.dwellingId}`}
                      className="hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3">
                        <div className="text-white text-sm font-medium">
                          {vacancy.propertyName}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {vacancy.propertyAddress}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {vacancy.dwellingName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300 text-sm">
                          {vacancy.currentOccupancy} / {vacancy.maxParticipants}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600/20 text-green-400">
                          {vacancy.availableSpots} spot
                          {vacancy.availableSpots !== 1 ? "s" : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Properties List */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Your Properties
          </h2>
          {dashboard?.properties && dashboard.properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.properties.map((prop) => (
                <div
                  key={prop._id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <h3 className="text-white font-medium">
                    {prop.propertyName || prop.addressLine1}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {prop.addressLine1}, {prop.suburb} {prop.state}{" "}
                    {prop.postcode}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      {prop.dwellings.length} dwelling
                      {prop.dwellings.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-400">
                      {prop.participants.length} participant
                      {prop.participants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Show access level per dwelling */}
                  <div className="mt-3 space-y-1">
                    {prop.dwellings.map((dwelling) => (
                      <div key={dwelling._id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 truncate mr-2">{dwelling.dwellingName}</span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            dwelling.accessLevel === "full"
                              ? "bg-green-600/20 text-green-400"
                              : dwelling.accessLevel === "incidents_only"
                                ? "bg-red-600/20 text-red-400"
                                : dwelling.accessLevel === "maintenance_only"
                                  ? "bg-yellow-600/20 text-yellow-400"
                                  : "bg-gray-600/20 text-gray-400"
                          }`}
                        >
                          {dwelling.accessLevel.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400">No properties allocated yet.</p>
              <p className="text-gray-400 text-sm mt-1">
                Contact your administrator to get property access.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
