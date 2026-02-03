"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import SILProviderHeader from "@/components/SILProviderHeader";

const INCIDENT_TYPES = [
  { value: "injury", label: "Injury" },
  { value: "near_miss", label: "Near Miss" },
  { value: "property_damage", label: "Property Damage" },
  { value: "behavioral", label: "Behavioral" },
  { value: "medication", label: "Medication" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
  // NDIS Reportable Types
  { value: "death", label: "Death (24hr NDIS)" },
  { value: "serious_injury", label: "Serious Injury (24hr NDIS)" },
  {
    value: "unauthorized_restrictive_practice",
    label: "Unauthorized Restrictive Practice (24hr NDIS)",
  },
  { value: "sexual_assault", label: "Sexual Assault (24hr NDIS)" },
  { value: "sexual_misconduct", label: "Sexual Misconduct (24hr NDIS)" },
  { value: "staff_assault", label: "Staff Assault (24hr NDIS)" },
  { value: "unlawful_conduct", label: "Unlawful Conduct (5-day NDIS)" },
  { value: "unexplained_injury", label: "Unexplained Injury (5-day NDIS)" },
  { value: "missing_participant", label: "Missing Participant (5-day NDIS)" },
];

export default function NewIncidentPage() {
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
    participantId: "" as string,
    incidentType: "injury" as string,
    severity: "minor" as string,
    title: "",
    description: "",
    incidentDate: new Date().toISOString().split("T")[0],
    incidentTime: "",
    location: "",
    witnessNames: "",
    immediateActionTaken: "",
    followUpRequired: false,
    followUpNotes: "",
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
  }, [router]);

  const dashboard = useQuery(
    api.silProviderPortal.getDashboard,
    silProviderId ? { silProviderId } : "skip"
  );

  const createIncident = useMutation(api.silProviderPortal.createIncident);

  // Get dwellings for selected property
  const selectedProperty = dashboard?.properties?.find(
    (p) => p._id === formData.propertyId
  );

  // Get participants for selected dwelling
  const dwellingParticipants =
    selectedProperty?.participants.filter(
      (p) => p.dwellingId === formData.dwellingId
    ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!silProviderId || !userId) return;

    // Dwelling is now required
    if (!formData.dwellingId) {
      alert("Please select a dwelling");
      return;
    }

    setIsSubmitting(true);
    try {
      await createIncident({
        silProviderId,
        userId,
        propertyId: formData.propertyId as Id<"properties">,
        dwellingId: formData.dwellingId as Id<"dwellings">,
        participantId: formData.participantId
          ? (formData.participantId as Id<"participants">)
          : undefined,
        incidentType: formData.incidentType as
          | "injury"
          | "near_miss"
          | "property_damage"
          | "behavioral"
          | "medication"
          | "abuse_neglect"
          | "complaint"
          | "death"
          | "serious_injury"
          | "unauthorized_restrictive_practice"
          | "sexual_assault"
          | "sexual_misconduct"
          | "staff_assault"
          | "unlawful_conduct"
          | "unexplained_injury"
          | "missing_participant"
          | "other",
        severity: formData.severity as
          | "minor"
          | "moderate"
          | "major"
          | "critical",
        title: formData.title,
        description: formData.description,
        incidentDate: formData.incidentDate,
        incidentTime: formData.incidentTime || undefined,
        location: formData.location || undefined,
        witnessNames: formData.witnessNames || undefined,
        immediateActionTaken: formData.immediateActionTaken || undefined,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes || undefined,
      });

      router.push("/portal/incidents");
    } catch (error) {
      console.error("Failed to create incident:", error);
      alert("Failed to create incident. Please try again.");
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
      <SILProviderHeader currentPage="incidents" providerName={providerName} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Report New Incident</h1>
          <p className="text-gray-400 mt-1">
            Document an incident at one of your properties
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
                      participantId: "",
                    })
                  }
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select Property</option>
                  {dashboard?.properties
                    ?.filter(
                      (p) =>
                        // Show properties that have at least one dwelling with incident access
                        p.dwellings.some(
                          (d) =>
                            d.accessLevel === "full" ||
                            d.accessLevel === "incidents_only"
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
                  Dwelling
                </label>
                <select
                  value={formData.dwellingId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dwellingId: e.target.value,
                      participantId: "",
                    })
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
                        d.accessLevel === "incidents_only"
                    )
                    .map((dwelling) => (
                      <option key={dwelling._id} value={dwelling._id}>
                        {dwelling.dwellingName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Participant Involved
                </label>
                <select
                  value={formData.participantId}
                  onChange={(e) =>
                    setFormData({ ...formData, participantId: e.target.value })
                  }
                  disabled={!formData.dwellingId}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white disabled:opacity-50"
                >
                  <option value="">Select Participant (Optional)</option>
                  {dwellingParticipants.map((participant) => (
                    <option key={participant._id} value={participant._id}>
                      {participant.firstName} {participant.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Specific Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Bathroom, Kitchen, Bedroom 2"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Incident Details
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Incident Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.incidentType}
                    onChange={(e) =>
                      setFormData({ ...formData, incidentType: e.target.value })
                    }
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    {INCIDENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.incidentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, incidentDate: e.target.value })
                    }
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.incidentTime}
                    onChange={(e) =>
                      setFormData({ ...formData, incidentTime: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
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
                  placeholder="Brief summary of the incident"
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
                  placeholder="Detailed description of what happened"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Witnesses
                </label>
                <input
                  type="text"
                  value={formData.witnessNames}
                  onChange={(e) =>
                    setFormData({ ...formData, witnessNames: e.target.value })
                  }
                  placeholder="Names of any witnesses"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Immediate Action Taken
                </label>
                <textarea
                  value={formData.immediateActionTaken}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      immediateActionTaken: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="What actions were taken immediately?"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Follow-up</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      followUpRequired: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span className="text-gray-300">Follow-up required</span>
              </label>

              {formData.followUpRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Follow-up Notes
                  </label>
                  <textarea
                    value={formData.followUpNotes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        followUpNotes: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="What follow-up is needed?"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}
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
              disabled={isSubmitting || !formData.propertyId}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Report Incident"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
