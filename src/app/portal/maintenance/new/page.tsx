"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

const WrenchIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" /></svg>;
const BoltIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const PlugIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>;
const HomeIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const TreeIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6m0 0l-3-3m3 3l3-3m-3-3V3m0 0L9 6m3-3l3 3M6.75 21h10.5" /></svg>;
const ShieldIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
const HammerIcon = () => <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" /></svg>;

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", icon: <WrenchIcon /> },
  { value: "electrical", label: "Electrical", icon: <BoltIcon /> },
  { value: "appliances", label: "Appliances", icon: <PlugIcon /> },
  { value: "building", label: "Building/Structure", icon: <HomeIcon /> },
  { value: "grounds", label: "Grounds/Landscaping", icon: <TreeIcon /> },
  { value: "safety", label: "Safety/Security", icon: <ShieldIcon /> },
  { value: "general", label: "General", icon: <HammerIcon /> },
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
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
      await alertDialog("Failed to create maintenance request. Please try again.");
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
                        // Show properties that have at least one dwelling with maintenance access
                        p.dwellings.some(
                          (d) =>
                            d.accessLevel === "full" ||
                            d.accessLevel === "maintenance_only"
                        )
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
                  {selectedProperty?.dwellings
                    .filter(
                      (d) =>
                        d.accessLevel === "full" ||
                        d.accessLevel === "maintenance_only"
                    )
                    .map((dwelling) => (
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
                  <div className="block mb-1">{cat.icon}</div>
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
                      color: "bg-teal-700",
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
                      <span className="text-xs text-gray-400 block">
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
