"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import HelpGuidePanel from "@/components/ui/HelpGuidePanel";
import { HELP_GUIDES } from "@/constants/helpGuides";
import { OCCUPANCY_COLORS, PROPERTY_STATUS_COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "../../../convex/_generated/dataModel";

const STATUS_FILTERS = [
  { value: "", label: "All Properties" },
  { value: "active", label: "Active SDA" },
  { value: "sil_property", label: "SIL Properties" },
  { value: "under_construction", label: "Under Construction" },
  { value: "planning", label: "Planning" },
] as const;

const STATUS_LABEL_MAP: Record<string, string> = {
  active: "Active SDA",
  sil_property: "SIL Properties",
  under_construction: "Under Construction",
  planning: "Planning Stage",
};

export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <RequireAuth>
        <div className="min-h-screen bg-gray-900">
          <Header currentPage="database" />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <LoadingScreen fullScreen={false} message="Loading properties..." />
          </main>
        </div>
      </RequireAuth>
    }>
      <PropertiesContent />
    </Suspense>
  );
}

function PropertiesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [showHelp, setShowHelp] = useState(false);
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  const filteredProperties = useMemo(() => {
    if (!properties) return undefined;
    if (!statusFilter) return properties;

    if (statusFilter === "active") {
      return properties.filter(p => !p.propertyStatus || p.propertyStatus === "active");
    }
    return properties.filter(p => p.propertyStatus === statusFilter);
  }, [properties, statusFilter]);

  const filterCounts = useMemo(() => {
    if (!properties) return {};
    return {
      "": properties.length,
      active: properties.filter(p => !p.propertyStatus || p.propertyStatus === "active").length,
      sil_property: properties.filter(p => p.propertyStatus === "sil_property").length,
      under_construction: properties.filter(p => p.propertyStatus === "under_construction").length,
      planning: properties.filter(p => p.propertyStatus === "planning").length,
    };
  }, [properties]);

  const subtitle = statusFilter
    ? `Showing ${STATUS_LABEL_MAP[statusFilter] || statusFilter} properties`
    : "Manage your SDA properties and dwellings";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Properties</h1>
              <p className="text-gray-300 mt-1">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <HelpGuideButton onClick={() => setShowHelp(true)} />
              <Link
                href="/properties/new"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                + Add Property
              </Link>
            </div>
          </div>

          {/* Status Filter Pills */}
          {properties && properties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Property status filters">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    statusFilter === filter.value
                      ? "bg-teal-700 text-white border-teal-600"
                      : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                  }`}
                  aria-pressed={statusFilter === filter.value}
                >
                  {filter.label}
                  <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full ${
                    statusFilter === filter.value ? "bg-white/20" : "bg-gray-700"
                  }`}>
                    {filterCounts[filter.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Properties List */}
          {filteredProperties === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading properties..." />
          ) : filteredProperties.length === 0 ? (
            statusFilter ? (
              <EmptyState
                title={`No ${STATUS_LABEL_MAP[statusFilter] || statusFilter} properties`}
                description="Try selecting a different filter or view all properties"
                isFiltered
                icon={<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>}
                secondaryAction={{
                  label: "View All Properties",
                  onClick: () => setStatusFilter(""),
                }}
              />
            ) : (
              <EmptyState
                title="No properties yet"
                description="Get started by adding your first SDA property"
                icon={<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
                action={{
                  label: "+ Add Your First Property",
                  href: "/properties/new",
                }}
              />
            )
          ) : (
            <div className="grid gap-6" role="list" aria-label="Properties list">
              {filteredProperties.map((property) => (
                <PropertyCard key={property._id} property={property} />
              ))}
            </div>
          )}
        </main>

        <HelpGuidePanel
          guide={HELP_GUIDES.properties}
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <BottomNav currentPage="database" />
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
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg"
      role="listitem"
    >
      <article className="bg-gray-800 rounded-lg p-6 border border-gray-600 hover:bg-gray-700/80 hover:border-gray-500 transition-colors cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-white">
                {property.propertyName || property.addressLine1}
              </h2>
              {statusBadge}
            </div>
            <p className="text-gray-300">
              {property.addressLine1}
              {property.addressLine2 && `, ${property.addressLine2}`}
            </p>
            <p className="text-gray-300">
              {property.suburb}, {property.state} {property.postcode}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${occupancyColor}`}>
              {property.currentOccupancy}/{property.totalCapacity} occupied
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-300 text-sm">Owner</p>
            <p className="text-white">{ownerName}</p>
          </div>
          <div>
            <p className="text-gray-300 text-sm">Dwellings</p>
            <p className="text-white">{property.dwellingCount}</p>
          </div>
          <div>
            <p className="text-gray-300 text-sm">Vacancies</p>
            <p className="text-white">{property.vacancies}</p>
          </div>
          <div>
            <p className="text-gray-300 text-sm">Revenue Share</p>
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
