"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NewInspectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ _id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    templateId: "",
    propertyId: "",
    dwellingId: "",
    inspectorId: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    location: "",
    preparedBy: "",
  });

  const templates = useQuery(api.inspections.getTemplates, {});
  const properties = useQuery(api.properties.getAll, {});
  const users = useQuery(api.auth.getAllUsers, {});
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    formData.propertyId
      ? { propertyId: formData.propertyId as Id<"properties"> }
      : "skip"
  );

  const createInspection = useMutation(api.inspections.createInspection);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    // Default inspector to current user
    setFormData((prev) => ({
      ...prev,
      inspectorId: parsedUser._id,
      preparedBy: `${parsedUser.firstName} ${parsedUser.lastName}`,
    }));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.templateId || !formData.propertyId) {
      alert("Please select a template and property");
      return;
    }

    setIsSubmitting(true);
    try {
      const inspectionId = await createInspection({
        templateId: formData.templateId as Id<"inspectionTemplates">,
        propertyId: formData.propertyId as Id<"properties">,
        dwellingId: formData.dwellingId
          ? (formData.dwellingId as Id<"dwellings">)
          : undefined,
        inspectorId: formData.inspectorId as Id<"users">,
        scheduledDate: formData.scheduledDate,
        location: formData.location || undefined,
        preparedBy: formData.preparedBy || undefined,
        createdBy: user._id as Id<"users">,
      });
      router.push(`/inspections/${inspectionId}`);
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Error creating inspection. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const selectedProperty = properties?.find((p) => p._id === formData.propertyId);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="inspections" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Link href="/inspections" className="text-gray-400 hover:text-white">
                Inspections
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">New Inspection</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">
            Create New Inspection
          </h1>

          {templates && templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-5xl mb-4">📋</div>
              <p className="text-gray-400 mb-4">
                No inspection templates available. Create a template first.
              </p>
              <Link
                href="/inspections/templates"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Manage Templates
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Inspection Template *
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) =>
                    setFormData({ ...formData, templateId: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a template</option>
                  {templates?.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {formData.templateId && templates && (
                  <p className="mt-2 text-gray-500 text-sm">
                    {templates.find((t) => t._id === formData.templateId)
                      ?.categories.length || 0}{" "}
                    categories,{" "}
                    {templates
                      .find((t) => t._id === formData.templateId)
                      ?.categories.reduce((sum, c) => sum + c.items.length, 0) ||
                      0}{" "}
                    items
                  </p>
                )}
              </div>

              {/* Property Selection */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Property *
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      propertyId: e.target.value,
                      dwellingId: "", // Reset dwelling when property changes
                    })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a property</option>
                  {properties?.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.propertyName || property.addressLine1} -{" "}
                      {property.suburb}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dwelling Selection (Optional) */}
              {formData.propertyId && dwellings && dwellings.length > 0 && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Dwelling (Optional)
                  </label>
                  <select
                    value={formData.dwellingId}
                    onChange={(e) =>
                      setFormData({ ...formData, dwellingId: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All dwellings / Property-wide</option>
                    {dwellings.map((dwelling) => (
                      <option key={dwelling._id} value={dwelling._id}>
                        {dwelling.dwellingName}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-gray-500 text-sm">
                    Leave blank for property-wide inspection
                  </p>
                </div>
              )}

              {/* Inspector Selection */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Inspector *
                </label>
                <select
                  value={formData.inspectorId}
                  onChange={(e) =>
                    setFormData({ ...formData, inspectorId: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an inspector</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Location Details */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Location Details (Optional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Unit 1, Ground Floor"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Prepared By */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Prepared By
                </label>
                <input
                  type="text"
                  value={formData.preparedBy}
                  onChange={(e) =>
                    setFormData({ ...formData, preparedBy: e.target.value })
                  }
                  placeholder="Name of person preparing inspection"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Summary */}
              {selectedProperty && formData.templateId && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">
                    Inspection Summary
                  </h3>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>
                      <span className="text-gray-500">Property:</span>{" "}
                      {selectedProperty.propertyName ||
                        selectedProperty.addressLine1}
                    </p>
                    <p>
                      <span className="text-gray-500">Address:</span>{" "}
                      {selectedProperty.addressLine1}, {selectedProperty.suburb}{" "}
                      {selectedProperty.state} {selectedProperty.postcode}
                    </p>
                    <p>
                      <span className="text-gray-500">Template:</span>{" "}
                      {templates?.find((t) => t._id === formData.templateId)
                        ?.name || ""}
                    </p>
                    <p>
                      <span className="text-gray-500">Scheduled:</span>{" "}
                      {formData.scheduledDate}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? "Creating..." : "Create Inspection"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
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
