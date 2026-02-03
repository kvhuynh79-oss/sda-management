"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "appliances", label: "Appliances", icon: "🔌" },
  { value: "building", label: "Building/Structure", icon: "🏠" },
  { value: "grounds", label: "Grounds/Landscaping", icon: "🌳" },
  { value: "safety", label: "Safety/Security", icon: "🛡️" },
  { value: "general", label: "General", icon: "🔨" },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const [silProviderId, setSilProviderId] = useState<Id<"silProviders"> | null>(
    null
  );
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [providerName, setProviderName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: "" as string,
    dwellingId: "" as string,
    category: "general" as string,
    priority: "medium" as string,
    title: "",
    description: "",
    reportedBy: "",
  });

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
    setUserId(user._id as Id<"users">);
    setProviderName(user.providerName || "");
    setFormData((prev) => ({
      ...prev,
      reportedBy: `${user.firstName} ${user.lastName}`,
    }));
  }, [router]);

  const dashboard = useQuery(
    api.silProviderPortal.getDashboard,
    silProviderId ? { silProviderId } : "skip"
  );

  const createMaintenanceRequest = useMutation(
    api.silProviderPortal.createMaintenanceRequest
  );

  // Get dwellings for selected property
  const selectedProperty = dashboard?.properties?.find(
    (p) => p._id === formData.propertyId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!silProviderId || !userId || !formData.dwellingId) return;

    setIsSubmitting(true);
    try {
      await createMaintenanceRequest({
        silProviderId,
        userId,
        dwellingId: formData.dwellingId as Id<"dwellings">,
        category: formData.category as
          | "plumbing"
          | "electrical"
          | "appliances"
          | "building"
          | "grounds"
          | "safety"
          | "general",
        priority: formData.priority as "urgent" | "high" | "medium" | "low",
        title: formData.title,
        description: formData.description,
        reportedBy: formData.reportedBy || undefined,
      });

      router.push("/portal/maintenance");
    } catch (error) {
      console.error("Failed to create maintenance request:", error);
      alert("Failed to create maintenance request. Please try again.");
    } finally {
      setIsSubmitting(false);
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
      <SILProviderHeader
        currentPage="maintenance"
        providerName={providerName}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Request Maintenance
          </h1>
          <p className="text-gray-400 mt-1">
            Submit a maintenance request for one of your properties
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      propertyId: e.target.value,
                      dwellingId: "",
                    })
                  }
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select Property</option>
                  {dashboard?.properties
                    ?.filter(
                      (p) =>
                        p.accessLevel === "full" ||
                        p.accessLevel === "maintenance_only"
                    )
                    .map((property) => (
                      <option key={property._id} value={property._id}>
                        {property.propertyName || property.addressLine1},{" "}
                        {property.suburb}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dwelling <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.dwellingId}
                  onChange={(e) =>
                    setFormData({ ...formData, dwellingId: e.target.value })
                  }
                  required
                  disabled={!formData.propertyId}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                >
                  <option value="">Select Dwelling</option>
                  {selectedProperty?.dwellings.map((dwelling) => (
                    <option key={dwelling._id} value={dwelling._id}>
                      {dwelling.dwellingName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, category: cat.value })
                  }
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    formData.category === cat.value
                      ? "bg-yellow-600/20 border-yellow-500 text-yellow-400"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <span className="text-2xl block mb-1">{cat.icon}</span>
                  <span className="text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Request Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      value: "low",
                      label: "Low",
                      color: "bg-blue-600",
                      desc: "Can wait",
                    },
                    {
                      value: "medium",
                      label: "Medium",
                      color: "bg-yellow-600",
                      desc: "Within a week",
                    },
                    {
                      value: "high",
                      label: "High",
                      color: "bg-orange-600",
                      desc: "Soon",
                    },
                    {
                      value: "urgent",
                      label: "Urgent",
                      color: "bg-red-600",
                      desc: "ASAP",
                    },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: p.value })
                      }
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        formData.priority === p.value
                          ? `${p.color}/30 border-current`
                          : "bg-gray-700 border-gray-600 hover:border-gray-500"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${formData.priority === p.value ? "text-white" : "text-gray-300"}`}
                      >
                        {p.label}
                      </span>
                      <span className="text-xs text-gray-500 block">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder="Brief description of the issue"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  rows={4}
                  placeholder="Detailed description of the issue and its location within the dwelling"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reported By
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) =>
                    setFormData({ ...formData, reportedBy: e.target.value })
                  }
                  placeholder="Your name"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.dwellingId}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
