"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading property details...</div>
        </main>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
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
      <Header />

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
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                Edit Property
              </button>
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
                {property.ownershipType === "investor" && (
                  <DetailRow
                    label="Revenue Share"
                    value={`${property.revenueSharePercent || 0}%`}
                  />
                )}
                {property.owner && property.owner.email && (
                  <DetailRow label="Email" value={property.owner.email} />
                )}
                {property.owner && property.owner.phone && (
                  <DetailRow label="Phone" value={property.owner.phone} />
                )}
              </div>
            </div>

            {/* SDA Registration */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">SDA Registration</h2>
              <div className="space-y-3">
                <DetailRow
                  label="Registration Number"
                  value={property.sdaRegistrationNumber || "Not registered"}
                />
                {property.sdaRegistrationDate && (
                  <DetailRow label="Registration Date" value={property.sdaRegistrationDate} />
                )}
              </div>
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
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  + Add Dwelling
                </button>
              </div>

              {dwellings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-5xl mb-4">🏘️</div>
                  <p className="text-gray-400 mb-4">No dwellings added yet</p>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    + Add First Dwelling
                  </button>
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

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Image
                src="/Logo.jpg"
                alt="Better Living Solutions"
                width={140}
                height={40}
                className="rounded"
              />
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-white font-medium">
                Properties
              </Link>
              <Link href="/participants" className="text-gray-400 hover:text-white transition-colors">
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link href="/maintenance" className="text-gray-400 hover:text-white transition-colors">
                Maintenance
              </Link>
              <Link href="/documents" className="text-gray-400 hover:text-white transition-colors">
                Documents
              </Link>
              <Link href="/alerts" className="text-gray-400 hover:text-white transition-colors">
                Alerts
              </Link>
              <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">
                Schedule
              </Link>
              <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">{user.firstName} {user.lastName}</span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
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

      <div className="grid grid-cols-3 gap-4 mb-4">
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
