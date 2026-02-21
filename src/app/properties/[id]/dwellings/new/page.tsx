"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function NewDwellingPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as Id<"properties">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userIdTyped = user ? (user.id as Id<"users">) : undefined;
  const property = useQuery(api.properties.getById, userIdTyped ? { propertyId, userId: userIdTyped } : "skip");
  const createDwelling = useMutation(api.dwellings.create);

  const [formData, setFormData] = useState({
    dwellingName: "",
    dwellingType: "unit" as "house" | "villa" | "apartment" | "unit",
    bedrooms: 1,
    bathrooms: 1,
    sdaDesignCategory: "high_physical_support" as
      | "improved_liveability"
      | "fully_accessible"
      | "robust"
      | "high_physical_support",
    sdaBuildingType: "new_build" as "new_build" | "existing",
    registrationDate: "",
    sdaRegisteredAmount: "",
    maxParticipants: 2,
    weeklyRentAmount: "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.dwellingName.trim()) {
      setError("Dwelling name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await createDwelling({
        userId: user?.id as Id<"users">,
        propertyId,
        dwellingName: formData.dwellingName,
        dwellingType: formData.dwellingType,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        sdaDesignCategory: formData.sdaDesignCategory,
        sdaBuildingType: formData.sdaBuildingType,
        registrationDate: formData.registrationDate || undefined,
        sdaRegisteredAmount: formData.sdaRegisteredAmount
          ? parseFloat(formData.sdaRegisteredAmount)
          : undefined,
        maxParticipants: formData.maxParticipants,
        weeklyRentAmount: formData.weeklyRentAmount
          ? parseFloat(formData.weeklyRentAmount)
          : undefined,
        notes: formData.notes || undefined,
      });

      router.push(`/properties/${propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add dwelling");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (property === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading...</div>
        </main>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-400 text-center py-12">Property not found</div>
        </main>
      </div>
    );
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="properties" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/properties" className="text-gray-400 hover:text-white">
                Properties
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link
                href={`/properties/${propertyId}`}
                className="text-gray-400 hover:text-white"
              >
                {property.propertyName || property.addressLine1}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">Add Dwelling</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Add New Dwelling</h1>
          <p className="text-gray-400 mb-6">
            Add a dwelling to {property.propertyName || property.addressLine1}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dwelling Number *
                </label>
                <input
                  type="text"
                  value={formData.dwellingName}
                  onChange={(e) =>
                    setFormData({ ...formData, dwellingName: e.target.value })
                  }
                  placeholder="e.g., 1/82, 2/82, Unit A"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dwelling Type *
                </label>
                <select
                  value={formData.dwellingType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dwellingType: e.target.value as typeof formData.dwellingType,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="unit">Unit</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bedrooms *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bedrooms: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bathrooms: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  SDA Design Category *
                </label>
                <select
                  value={formData.sdaDesignCategory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sdaDesignCategory:
                        e.target.value as typeof formData.sdaDesignCategory,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="high_physical_support">High Physical Support</option>
                  <option value="fully_accessible">Fully Accessible</option>
                  <option value="improved_liveability">Improved Liveability</option>
                  <option value="robust">Robust</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Building Type *
                </label>
                <select
                  value={formData.sdaBuildingType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sdaBuildingType:
                        e.target.value as typeof formData.sdaBuildingType,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="new_build">New Build</option>
                  <option value="existing">Existing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max Participants *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  value={formData.registrationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, registrationDate: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  SDA Registered Amount (Annual)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sdaRegisteredAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, sdaRegisteredAmount: e.target.value })
                  }
                  placeholder="e.g., 79620"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Weekly Rent Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weeklyRentAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, weeklyRentAmount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any additional notes about this dwelling..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? "Adding..." : "Add Dwelling"}
              </button>
              <Link
                href={`/properties/${propertyId}`}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}
