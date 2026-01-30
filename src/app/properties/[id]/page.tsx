"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<{ role: string } | null>(null);

  const propertyId = params.id as Id<"properties">;
  const property = useQuery(api.properties.getById, { propertyId });
  const dwellings = useQuery(api.dwellings.getByProperty, { propertyId });

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

  if (property === undefined || dwellings === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading property details...</div>
        </main>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-400 text-center py-12">Property not found</div>
        </main>
      </div>
    );
  }

  const getOwnerName = () => {
    if (!property.owner) return "Unknown";
    if (property.owner.ownerType === "self") return "Self-owned";
    if (property.owner.companyName) return property.owner.companyName;
    return `${property.owner.firstName} ${property.owner.lastName}`;
  };

  const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
  const currentOccupancy = dwellings.reduce((sum, d) => sum + d.currentOccupancy, 0);
  const vacancies = totalCapacity - currentOccupancy;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="properties" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/properties" className="text-gray-400 hover:text-white">
                Properties
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">{property.propertyName || property.addressLine1}</li>
          </ol>
        </nav>

        {/* Property Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {property.propertyName || property.addressLine1}
              </h1>
              <p className="text-gray-400 text-lg">
                {property.addressLine1}
                {property.addressLine2 && `, ${property.addressLine2}`}
              </p>
              <p className="text-gray-400">
                {property.suburb}, {property.state} {property.postcode}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/properties/${propertyId}/edit`}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Edit Property
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <StatCard label="Dwellings" value={dwellings.length.toString()} />
            <StatCard label="Total Capacity" value={totalCapacity.toString()} />
            <StatCard
              label="Current Occupancy"
              value={currentOccupancy.toString()}
              color="green"
            />
            <StatCard
              label="Vacancies"
              value={vacancies.toString()}
              color={vacancies > 0 ? "yellow" : "green"}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Owner Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Owner Information</h2>
              <div className="space-y-3">
                <DetailRow label="Owner" value={getOwnerName()} />
                <DetailRow label="Ownership Type" value={property.ownershipType.replace("_", " ")} />
                <DetailRow
                  label="Management Fee %"
                  value={`${property.managementFeePercent || 0}%`}
                />
                {property.owner && property.owner.email && (
                  <DetailRow label="Email" value={property.owner.email} />
                )}
                {property.owner && property.owner.phone && (
                  <DetailRow label="Phone" value={property.owner.phone} />
                )}
                {property.owner && property.owner.abn && (
                  <DetailRow label="ABN" value={property.owner.abn} />
                )}
              </div>

              {/* Bank Details */}
              {property.owner && (property.owner.bankAccountName || property.owner.bankBsb || property.owner.bankAccountNumber) && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Bank Details</h3>
                  <div className="space-y-2">
                    {property.owner.bankAccountName && (
                      <DetailRow label="Account Name" value={property.owner.bankAccountName} />
                    )}
                    {property.owner.bankBsb && (
                      <DetailRow label="BSB" value={property.owner.bankBsb} />
                    )}
                    {property.owner.bankAccountNumber && (
                      <DetailRow label="Account Number" value={property.owner.bankAccountNumber} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {property.notes && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Dwellings */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Dwellings</h2>
                <Link
                  href={`/properties/${propertyId}/dwellings/new`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  + Add Dwelling
                </Link>
              </div>

              {dwellings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-5xl mb-4">🏘️</div>
                  <p className="text-gray-400 mb-4">No dwellings added yet</p>
                  <Link
                    href={`/properties/${propertyId}/dwellings/new`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    + Add First Dwelling
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dwellings.map((dwelling) => (
                    <DwellingCard key={dwelling._id} dwelling={dwelling} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "blue"
}: {
  label: string;
  value: string;
  color?: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function DwellingCard({ dwelling }: { dwelling: any }) {
  const getOccupancyColor = () => {
    if (dwelling.occupancyStatus === "fully_occupied") return "bg-green-600";
    if (dwelling.occupancyStatus === "vacant") return "bg-red-600";
    return "bg-yellow-600";
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{dwelling.dwellingName}</h3>
          <p className="text-gray-400 text-sm capitalize">{dwelling.dwellingType}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs text-white ${getOccupancyColor()}`}>
          {dwelling.currentOccupancy}/{dwelling.maxParticipants} occupied
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-gray-500 text-xs">Bedrooms</p>
          <p className="text-white text-sm">{dwelling.bedrooms}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Design Category</p>
          <p className="text-white text-sm">{formatCategory(dwelling.sdaDesignCategory)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Building Type</p>
          <p className="text-white text-sm capitalize">{dwelling.sdaBuildingType.replace("_", " ")}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Registration Date</p>
          <p className="text-white text-sm">{dwelling.registrationDate || "Not registered"}</p>
        </div>
      </div>

      {dwelling.participants && dwelling.participants.length > 0 && (
        <div className="pt-3 border-t border-gray-600">
          <p className="text-gray-400 text-xs mb-2">Current Residents:</p>
          <div className="space-y-1">
            {dwelling.participants.map((participant: any) => (
              <Link
                key={participant._id}
                href={`/participants/${participant._id}`}
                className="flex justify-between items-center p-2 bg-gray-800 rounded hover:bg-gray-750 transition-colors"
              >
                <span className="text-white text-sm">
                  {participant.firstName} {participant.lastName}
                </span>
                <span className="text-gray-400 text-xs">{participant.ndisNumber}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
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
