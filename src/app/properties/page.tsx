"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";
import { OCCUPANCY_COLORS, PROPERTY_STATUS_COLORS } from "@/constants/colors";

export default function PropertiesPage() {
  const properties = useQuery(api.properties.getAll);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Properties</h1>
              <p className="text-gray-400 mt-1">Manage your SDA properties and dwellings</p>
            </div>
            <Link
              href="/properties/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + Add Property
            </Link>
          </div>

          {/* Properties List */}
          {properties === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading properties..." />
          ) : properties.length === 0 ? (
            <EmptyState
              title="No properties yet"
              description="Get started by adding your first SDA property"
              icon={<span className="text-6xl">🏠</span>}
              action={{
                label: "+ Add Your First Property",
                href: "/properties/new",
              }}
            />
          ) : (
            <div className="grid gap-6" role="list" aria-label="Properties list">
              {properties.map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

function PropertyCard({ property }: { property: any }) {
  const ownerName = useMemo(() => {
    if (!property.owner) return "Unknown";
    if (property.owner.ownerType === "self") return "Self-owned";
    if (property.owner.companyName) return property.owner.companyName;
    return `${property.owner.firstName} ${property.owner.lastName}`;
  }, [property.owner]);

  const occupancyColor = useMemo(() => {
    if (property.vacancies === 0) return OCCUPANCY_COLORS.full;
    if (property.currentOccupancy === 0) return OCCUPANCY_COLORS.empty;
    return OCCUPANCY_COLORS.partial;
  }, [property.vacancies, property.currentOccupancy]);

  const statusBadge = useMemo(() => {
    const status = property.propertyStatus;
    if (!status || status === "active") return null;

    const config = PROPERTY_STATUS_COLORS[status as keyof typeof PROPERTY_STATUS_COLORS];
    if (!config) return null;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${config.bg}`}>
        {config.label}
      </span>
    );
  }, [property.propertyStatus]);

  return (
    <Link
      href={`/properties/${property._id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
      role="listitem"
    >
      <article className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-white">
                {property.propertyName || property.addressLine1}
              </h2>
              {statusBadge}
            </div>
            <p className="text-gray-400">
              {property.addressLine1}
              {property.addressLine2 && `, ${property.addressLine2}`}
            </p>
            <p className="text-gray-400">
              {property.suburb}, {property.state} {property.postcode}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${occupancyColor}`}>
              {property.currentOccupancy}/{property.totalCapacity} occupied
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Owner</p>
            <p className="text-white">{ownerName}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Dwellings</p>
            <p className="text-white">{property.dwellingCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Vacancies</p>
            <p className="text-white">{property.vacancies}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Revenue Share</p>
            <p className="text-white">
              {property.ownershipType === "self_owned"
                ? "N/A"
                : `${property.revenueSharePercent || 0}%`}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
