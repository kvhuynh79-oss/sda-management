"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function PropertiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const properties = useQuery(api.properties.getAll);

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

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Properties</h2>
            <p className="text-gray-400 mt-1">Manage your SDA properties and dwellings</p>
          </div>
          <Link
            href="/properties/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Add Property
          </Link>
        </div>

        {/* Properties List */}
        {properties === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading properties...</div>
        ) : properties.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6">
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
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
            <Link href="/dashboard" className="text-xl font-bold text-white">
              SDA Management
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

function PropertyCard({ property }: { property: any }) {
  const getOwnerName = () => {
    if (!property.owner) return "Unknown";
    if (property.owner.ownerType === "self") return "Self-owned";
    if (property.owner.companyName) return property.owner.companyName;
    return `${property.owner.firstName} ${property.owner.lastName}`;
  };

  const getOccupancyColor = () => {
    if (property.vacancies === 0) return "bg-green-600";
    if (property.currentOccupancy === 0) return "bg-red-600";
    return "bg-yellow-600";
  };

  return (
    <Link href={`/properties/${property._id}`}>
      <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {property.propertyName || property.addressLine1}
            </h3>
            <p className="text-gray-400 mt-1">
              {property.addressLine1}
              {property.addressLine2 && `, ${property.addressLine2}`}
            </p>
            <p className="text-gray-400">
              {property.suburb}, {property.state} {property.postcode}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${getOccupancyColor()}`}>
              {property.currentOccupancy}/{property.totalCapacity} occupied
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-4 gap-4">
          <div>
            <p className="text-gray-500 text-sm">Owner</p>
            <p className="text-white">{getOwnerName()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Dwellings</p>
            <p className="text-white">{property.dwellingCount}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Vacancies</p>
            <p className="text-white">{property.vacancies}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Revenue Share</p>
            <p className="text-white">
              {property.ownershipType === "self_owned" 
                ? "N/A" 
                : `${property.revenueSharePercent || 0}%`}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-500 text-6xl mb-4">🏠</div>
      <h3 className="text-xl font-semibold text-white mb-2">No properties yet</h3>
      <p className="text-gray-400 mb-6">Get started by adding your first SDA property</p>
      <Link
        href="/properties/new"
        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        + Add Your First Property
      </Link>
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
