"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useOrganization } from "@/contexts/OrganizationContext";

function NewEmergencyPlanContent() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedDwellingId, setSelectedDwellingId] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const properties = useQuery(
    api.properties.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const dwellings = useQuery(
    api.dwellings.getByProperty,
    user && selectedPropertyId
      ? {
          userId: user.id as Id<"users">,
          propertyId: selectedPropertyId as Id<"properties">,
        }
      : "skip"
  );

  const createPlan = useMutation(api.emergencyManagementPlans.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPropertyId) return;

    setIsSaving(true);
    setError("");

    try {
      const planId = await createPlan({
        userId: user.id as Id<"users">,
        propertyId: selectedPropertyId as Id<"properties">,
        dwellingId: selectedDwellingId
          ? (selectedDwellingId as Id<"dwellings">)
          : undefined,
        emergencyContacts: [
          { service: "Emergency Services", phone: "000" },
          { service: "SES", phone: "132 500" },
          { service: "Poison Information", phone: "131 126" },
          { service: "Police (non-emergency)", phone: "131 444" },
        ],
        emergencyKit: [
          { item: "First Aid Kit" },
          { item: "Fire Extinguisher" },
          { item: "Fire Blanket" },
          { item: "Torch/Flashlight" },
          { item: "Emergency Contact List" },
          { item: "Evacuation Map" },
        ],
        procedures: [
          { type: "fire", steps: "" },
          { type: "medical_emergency", steps: "" },
          { type: "flood", steps: "" },
          { type: "power_outage", steps: "" },
        ],
      });

      router.push(`/compliance/emergency-plans/${planId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create emergency plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/compliance/emergency-plans"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Emergency Plans
            </Link>
            <h1 className="text-2xl font-bold text-white">New Emergency Management Plan</h1>
            <p className="text-gray-400 mt-1">
              Create a new emergency management plan for an SDA property
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-teal-900/20 border border-teal-600/40 rounded-lg p-4 mb-6">
          <p className="text-teal-400 text-sm">
            A new plan will be created in Draft status with default Australian emergency contacts,
            standard emergency kit items, and common procedure templates. You can customise all
            sections after creation.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
          {/* Property Selection */}
          <div>
            <label htmlFor="new-emp-property" className="block text-sm font-medium text-gray-300 mb-1">
              Property *
            </label>
            <select
              id="new-emp-property"
              required
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setSelectedDwellingId("");
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
            >
              <option value="">Select a property...</option>
              {properties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.propertyName || p.addressLine1}
                  {p.suburb ? `, ${p.suburb}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Dwelling Selection (optional, shown when property selected) */}
          {selectedPropertyId && (
            <div>
              <label htmlFor="new-emp-dwelling" className="block text-sm font-medium text-gray-300 mb-1">
                Dwelling (optional)
              </label>
              <select
                id="new-emp-dwelling"
                value={selectedDwellingId}
                onChange={(e) => setSelectedDwellingId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">Whole property (no specific dwelling)</option>
                {dwellings === undefined ? (
                  <option disabled>Loading dwellings...</option>
                ) : dwellings.length === 0 ? (
                  <option disabled>No dwellings found for this property</option>
                ) : (
                  dwellings.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.dwellingName || "Dwelling"}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Select a specific dwelling or leave blank for a whole-property plan
              </p>
            </div>
          )}

          {/* Defaults Preview */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">This plan will include:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Emergency Contacts</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>Emergency Services (000)</li>
                  <li>SES (132 500)</li>
                  <li>Poison Information (131 126)</li>
                  <li>Police non-emergency (131 444)</li>
                </ul>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Emergency Kit</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>First Aid Kit</li>
                  <li>Fire Extinguisher</li>
                  <li>Fire Blanket</li>
                  <li>Torch/Flashlight</li>
                  <li>Emergency Contact List</li>
                  <li>Evacuation Map</li>
                </ul>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 sm:col-span-2">
                <p className="text-xs font-medium text-gray-400 mb-2">Procedure Templates</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">Fire</span>
                  <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">Medical Emergency</span>
                  <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">Flood</span>
                  <span className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">Power Outage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/compliance/emergency-plans"
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || !selectedPropertyId}
              className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {isSaving ? "Creating..." : "Create Emergency Plan"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function BlsGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoading } = useOrganization();
  if (isLoading) return null;
  if (organization?.slug !== "better-living-solutions") {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">New Emergency Plan</h1>
            <p className="text-gray-400">This feature is not available for your organisation.</p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

export default function NewEmergencyPlanPage() {
  return (
    <RequireAuth>
      <BlsGate>
        <NewEmergencyPlanContent />
      </BlsGate>
    </RequireAuth>
  );
}
