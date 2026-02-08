"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NewPreventativeSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyId && user ? { propertyId: selectedPropertyId as Id<"properties">, userId: user.id as Id<"users"> } : "skip"
  );

  const createSchedule = useMutation(api.preventativeSchedule.create);

  const [formData, setFormData] = useState({
    propertyId: "",
    dwellingId: "",
    taskName: "",
    description: "",
    category: "general" as
      | "plumbing"
      | "electrical"
      | "appliances"
      | "building"
      | "grounds"
      | "safety"
      | "general",
    frequencyType: "monthly" as "weekly" | "monthly" | "quarterly" | "biannually" | "annually",
    frequencyInterval: "1",
    nextDueDate: "",
    estimatedCost: "",
    contractorName: "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed._id || parsed.id;
    if (userId) {
      setUser({ id: userId, role: parsed.role });
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.propertyId || !formData.taskName || !formData.nextDueDate) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await createSchedule({
        userId: user!.id as Id<"users">,
        propertyId: formData.propertyId as Id<"properties">,
        dwellingId: formData.dwellingId
          ? (formData.dwellingId as Id<"dwellings">)
          : undefined,
        taskName: formData.taskName,
        description: formData.description || undefined,
        category: formData.category,
        frequencyType: formData.frequencyType,
        frequencyInterval: parseInt(formData.frequencyInterval),
        nextDueDate: formData.nextDueDate,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
        contractorName: formData.contractorName || undefined,
        notes: formData.notes || undefined,
      });

      router.push("/preventative-schedule");
    } catch (err) {
      console.error("Failed to create preventative schedule:", err);
      alert("Failed to create preventative schedule. Please try again.");
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="schedule" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/preventative-schedule"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Preventative Schedule
          </Link>
          <h2 className="text-2xl font-bold text-white">Create Preventative Maintenance Schedule</h2>
          <p className="text-gray-400 mt-1">Set up recurring maintenance tasks</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Property Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Property <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.propertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setFormData({ ...formData, propertyId: e.target.value, dwellingId: "" });
              }}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select property...</option>
              {properties?.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.propertyName || property.addressLine1}, {property.suburb}
                </option>
              ))}
            </select>
          </div>

          {/* Dwelling Selection (Optional) */}
          {selectedPropertyId && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Dwelling (Optional - leave blank for entire property)
              </label>
              <select
                value={formData.dwellingId}
                onChange={(e) => setFormData({ ...formData, dwellingId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Entire Property</option>
                {dwellings?.map((dwelling) => (
                  <option key={dwelling._id} value={dwelling._id}>
                    {dwelling.dwellingName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Task Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              required
              placeholder="e.g., Pool maintenance, HVAC servicing"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Details about the maintenance task..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as typeof formData.category,
                })
              }
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="appliances">Appliances</option>
              <option value="building">Building</option>
              <option value="grounds">Grounds</option>
              <option value="safety">Safety</option>
            </select>
          </div>

          {/* Frequency Type and Interval */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Frequency Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.frequencyType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    frequencyType: e.target.value as typeof formData.frequencyType,
                  })
                }
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannually">Biannually</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Every (Interval) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.frequencyInterval}
                onChange={(e) => setFormData({ ...formData, frequencyInterval: e.target.value })}
                required
                placeholder="1"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                E.g., "2" with "Monthly" = every 2 months
              </p>
            </div>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Next Due Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.nextDueDate}
              onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Estimated Cost</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Contractor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contractor Name
            </label>
            <input
              type="text"
              value={formData.contractorName}
              onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
              placeholder="Preferred contractor for this task"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes or instructions..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Schedule
            </button>
            <Link
              href="/preventative-schedule"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
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
