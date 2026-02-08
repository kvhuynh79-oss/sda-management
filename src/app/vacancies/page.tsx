"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Header from "../../components/Header";
import Link from "next/link";

export default function VacanciesPage() {
  const [selectedDwellingId, setSelectedDwellingId] = useState<Id<"dwellings"> | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  const vacancySummary = useQuery(api.vacancyListings.getSummary);
  const coordinators = useQuery(api.supportCoordinators.getAll, { status: "active" });
  const upsertListing = useMutation(api.vacancyListings.upsert);
  const notifyCoordinator = useMutation(api.vacancyListings.notifyCoordinator);

  const handleChecklistChange = async (
    dwellingId: Id<"dwellings">,
    field: "goNestListed" | "housingHubListed" | "ndisNotified",
    checked: boolean
  ) => {
    const today = new Date().toISOString().split("T")[0];
    const dateField = field.replace("Listed", "ListedDate").replace("Notified", "NotifiedDate") as
      | "goNestListedDate"
      | "housingHubListedDate"
      | "ndisNotifiedDate";

    await upsertListing({
      dwellingId,
      [field]: checked,
      [dateField]: checked ? today : undefined,
    });
  };

  const handleNotifyCoordinators = async (
    dwellingId: Id<"dwellings">,
    coordinatorIds: Id<"supportCoordinators">[]
  ) => {
    for (const coordinatorId of coordinatorIds) {
      await notifyCoordinator({ dwellingId, coordinatorId });
    }
    setShowNotifyModal(false);
    setSelectedDwellingId(null);
  };

  const selectedVacancy = vacancySummary?.vacancies.find(
    (v) => v.dwelling._id === selectedDwellingId
  );

  // Get coordinators matching the property area
  const getMatchingCoordinators = (suburb?: string) => {
    if (!coordinators || !suburb) return coordinators || [];
    return coordinators.filter((c) =>
      c.areas.some(
        (area) =>
          area.toLowerCase().includes(suburb.toLowerCase()) ||
          suburb.toLowerCase().includes(area.toLowerCase())
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="operations" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Vacancy Management</h1>
          <p className="text-gray-400 mt-1">
            Track and manage property vacancies across all platforms
          </p>
        </div>

        {/* Summary Stats */}
        {vacancySummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-3xl font-bold text-red-400">
                {vacancySummary.totalVacantDwellings}
              </p>
              <p className="text-sm text-gray-400">Fully Vacant</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-3xl font-bold text-yellow-400">
                {vacancySummary.totalPartiallyOccupied}
              </p>
              <p className="text-sm text-gray-400">Partially Occupied</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-3xl font-bold text-white">
                {vacancySummary.totalVacantSpots}
              </p>
              <p className="text-sm text-gray-400">Total Vacant Spots</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-3xl font-bold text-green-400">
                {vacancySummary.fullyListedCount}
              </p>
              <p className="text-sm text-gray-400">Fully Listed</p>
            </div>
          </div>
        )}

        {/* Vacancies Table */}
        {!vacancySummary ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading vacancies...</p>
          </div>
        ) : vacancySummary.vacancies.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No vacancies found</p>
            <p className="text-gray-400 text-sm mt-2">
              All dwellings are fully occupied
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vacancySummary.vacancies.map((vacancy) => (
              <div
                key={vacancy.dwelling._id}
                className="bg-gray-800 rounded-lg p-4 sm:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Property Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {vacancy.property?.propertyName || vacancy.property?.addressLine1}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          vacancy.dwelling.occupancyStatus === "vacant"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {vacancy.dwelling.occupancyStatus.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-1">
                      {vacancy.dwelling.dwellingName} - {vacancy.dwelling.bedrooms} bed
                    </p>
                    <p className="text-gray-400 text-sm">
                      {vacancy.property?.suburb}, {vacancy.property?.state}
                    </p>
                    <div className="mt-2">
                      <span className="text-white font-medium">{vacancy.vacantSpots}</span>
                      <span className="text-gray-400"> of {vacancy.dwelling.maxParticipants} spots available</span>
                    </div>
                    <p className="text-sm text-purple-400 mt-1">
                      {vacancy.dwelling.sdaDesignCategory.replace(/_/g, " ")}
                    </p>
                  </div>

                  {/* Listing Checklist */}
                  <div className="lg:w-96">
                    <p className="text-sm text-gray-400 mb-3">Listing Checklist</p>
                    <div className="space-y-3">
                      {/* Go Nest */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vacancy.listing?.goNestListed || false}
                          onChange={(e) =>
                            handleChecklistChange(
                              vacancy.dwelling._id,
                              "goNestListed",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-white">Go Nest</span>
                        {vacancy.listing?.goNestListedDate && (
                          <span className="text-gray-400 text-sm">
                            {vacancy.listing.goNestListedDate}
                          </span>
                        )}
                      </label>

                      {/* Housing Hub */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vacancy.listing?.housingHubListed || false}
                          onChange={(e) =>
                            handleChecklistChange(
                              vacancy.dwelling._id,
                              "housingHubListed",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-white">Housing Hub</span>
                        {vacancy.listing?.housingHubListedDate && (
                          <span className="text-gray-400 text-sm">
                            {vacancy.listing.housingHubListedDate}
                          </span>
                        )}
                      </label>

                      {/* NDIS Notified */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vacancy.listing?.ndisNotified || false}
                          onChange={(e) =>
                            handleChecklistChange(
                              vacancy.dwelling._id,
                              "ndisNotified",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-white">NDIS Vacancy Notified</span>
                        {vacancy.listing?.ndisNotifiedDate && (
                          <span className="text-gray-400 text-sm">
                            {vacancy.listing.ndisNotifiedDate}
                          </span>
                        )}
                      </label>
                    </div>

                    {/* Coordinator Notifications */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">Support Coordinators</p>
                        <button
                          onClick={() => {
                            setSelectedDwellingId(vacancy.dwelling._id);
                            setShowNotifyModal(true);
                          }}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Notify Coordinators
                        </button>
                      </div>
                      {vacancy.listing?.coordinatorsNotified &&
                      vacancy.listing.coordinatorsNotified.length > 0 ? (
                        <p className="text-gray-400 text-sm mt-1">
                          {vacancy.listing.coordinatorsNotified.length} notified
                          {vacancy.listing.lastNotificationDate && (
                            <> on {vacancy.listing.lastNotificationDate}</>
                          )}
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm mt-1">No coordinators notified yet</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2">
                    <Link
                      href={`/properties/${vacancy.property?._id}`}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors text-center"
                    >
                      View Property
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Notify Coordinators Modal */}
      {showNotifyModal && selectedDwellingId && (
        <NotifyCoordinatorsModal
          vacancy={selectedVacancy!}
          coordinators={coordinators || []}
          getMatchingCoordinators={getMatchingCoordinators}
          onNotify={(ids) => handleNotifyCoordinators(selectedDwellingId, ids)}
          onClose={() => {
            setShowNotifyModal(false);
            setSelectedDwellingId(null);
          }}
        />
      )}
    </div>
  );
}

type CoordinatorForNotify = {
  _id: Id<"supportCoordinators">;
  firstName: string;
  lastName: string;
  organization?: string;
  areas: string[];
};

interface NotifyCoordinatorsModalProps {
  vacancy: {
    dwelling: { _id: Id<"dwellings"> };
    property: { suburb: string } | null;
    listing?: { coordinatorsNotified?: Id<"supportCoordinators">[] } | null;
  };
  coordinators: CoordinatorForNotify[];
  getMatchingCoordinators: (suburb?: string) => CoordinatorForNotify[];
  onNotify: (ids: Id<"supportCoordinators">[]) => void;
  onClose: () => void;
}

function NotifyCoordinatorsModal({
  vacancy,
  coordinators,
  getMatchingCoordinators,
  onNotify,
  onClose,
}: NotifyCoordinatorsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Id<"supportCoordinators">[]>([]);
  const [showAll, setShowAll] = useState(false);

  const matchingCoordinators = getMatchingCoordinators(vacancy.property?.suburb);
  const displayCoordinators = showAll ? coordinators : matchingCoordinators;

  const alreadyNotified = new Set(vacancy.listing?.coordinatorsNotified || []);

  const toggleCoordinator = (id: Id<"supportCoordinators">) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const notYetNotified = displayCoordinators
      .filter((c) => !alreadyNotified.has(c._id))
      .map((c) => c._id);
    setSelectedIds(notYetNotified);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold text-white mb-4">
          Notify Support Coordinators
        </h2>

        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500"
            />
            Show all coordinators
          </label>
          <button
            onClick={selectAll}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Select all available
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {displayCoordinators.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              No coordinators found for this area
            </p>
          ) : (
            displayCoordinators.map((coordinator) => {
              const isAlreadyNotified = alreadyNotified.has(coordinator._id);
              const isSelected = selectedIds.includes(coordinator._id);

              return (
                <label
                  key={coordinator._id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isAlreadyNotified
                      ? "bg-gray-700/50 opacity-60"
                      : isSelected
                      ? "bg-blue-600/20 border border-blue-500"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isAlreadyNotified}
                    onChange={() => toggleCoordinator(coordinator._id)}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <p className="text-white">
                      {coordinator.firstName} {coordinator.lastName}
                      {isAlreadyNotified && (
                        <span className="text-green-400 text-sm ml-2">(already notified)</span>
                      )}
                    </p>
                    {coordinator.organization && (
                      <p className="text-gray-400 text-sm">{coordinator.organization}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {coordinator.areas.slice(0, 3).map((area) => (
                        <span
                          key={area}
                          className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded"
                        >
                          {area}
                        </span>
                      ))}
                      {coordinator.areas.length > 3 && (
                        <span className="text-gray-400 text-xs">
                          +{coordinator.areas.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            {selectedIds.length} coordinator(s) selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onNotify(selectedIds)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Mark as Notified
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
