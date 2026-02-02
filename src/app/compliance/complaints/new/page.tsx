"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import Link from "next/link";

export default function NewComplaintPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const properties = useQuery(api.properties.getAll);
  const participants = useQuery(api.participants.getAll);
  const createComplaint = useMutation(api.complaints.create);

  const [formData, setFormData] = useState({
    complainantType: "" as
      | "participant"
      | "family_carer"
      | "support_coordinator"
      | "sil_provider"
      | "staff"
      | "anonymous"
      | "other"
      | "",
    complainantName: "",
    complainantContact: "",
    participantId: "",
    propertyId: "",
    complaintDate: new Date().toISOString().split("T")[0],
    receivedDate: new Date().toISOString().split("T")[0],
    category: "" as
      | "service_delivery"
      | "staff_conduct"
      | "property_condition"
      | "communication"
      | "billing"
      | "privacy"
      | "safety"
      | "other"
      | "",
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    advocacyOffered: false,
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
    if (!user || !formData.complainantType || !formData.category) return;

    setIsSaving(true);
    setError("");

    try {
      await createComplaint({
        complainantType: formData.complainantType,
        complainantName: formData.complainantName || undefined,
        complainantContact: formData.complainantContact || undefined,
        participantId: formData.participantId ? formData.participantId as Id<"participants"> : undefined,
        propertyId: formData.propertyId ? formData.propertyId as Id<"properties"> : undefined,
        complaintDate: formData.complaintDate,
        receivedDate: formData.receivedDate,
        receivedBy: user.id as Id<"users">,
        category: formData.category,
        description: formData.description,
        severity: formData.severity,
        advocacyOffered: formData.advocacyOffered,
      });

      router.push("/compliance");
    } catch (err: any) {
      setError(err.message || "Failed to log complaint");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/compliance" className="text-blue-400 hover:text-blue-300 text-sm mb-2 block">
              &larr; Back to Compliance
            </Link>
            <h1 className="text-2xl font-bold text-white">Log Complaint</h1>
            <p className="text-gray-400 mt-1">Record and track complaints as required by NDIS Practice Standards</p>
          </div>
        </div>

        {/* Link to Compliance Guides */}
        <div className="mb-4">
          <Link href="/compliance" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2">
            <span>ℹ️</span> View Complaints Handling Guide in Compliance Dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Complainant Section */}
          <div className="border-b border-gray-700 pb-6">
            <h3 className="text-lg font-medium text-white mb-4">Complainant Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Complainant Type *
                </label>
                <select
                  required
                  value={formData.complainantType}
                  onChange={(e) => setFormData({ ...formData, complainantType: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select complainant type...</option>
                  <option value="participant">Participant</option>
                  <option value="family_carer">Family Member / Carer</option>
                  <option value="support_coordinator">Support Coordinator</option>
                  <option value="sil_provider">SIL Provider</option>
                  <option value="staff">Staff Member</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {formData.complainantType !== "anonymous" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Complainant Name
                    </label>
                    <input
                      type="text"
                      value={formData.complainantName}
                      onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                      placeholder="Full name"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contact Details
                    </label>
                    <input
                      type="text"
                      value={formData.complainantContact}
                      onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
                      placeholder="Phone or email"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Participant/Property */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Related Participant (if applicable)
              </label>
              <select
                value={formData.participantId}
                onChange={(e) => setFormData({ ...formData, participantId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select participant...</option>
                {participants?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Related Property (if applicable)
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select property...</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName} - {p.suburb}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date of Complaint *
              </label>
              <input
                type="date"
                required
                value={formData.complaintDate}
                onChange={(e) => setFormData({ ...formData, complaintDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <p className="text-gray-500 text-xs mt-1">When the issue occurred or was raised</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date Received *
              </label>
              <input
                type="date"
                required
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <p className="text-gray-500 text-xs mt-1">When complaint was formally received (starts 5-day acknowledgment clock)</p>
            </div>
          </div>

          {/* Category & Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Complaint Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select category...</option>
                <option value="service_delivery">Service Delivery</option>
                <option value="staff_conduct">Staff Conduct</option>
                <option value="property_condition">Property Condition</option>
                <option value="communication">Communication</option>
                <option value="billing">Billing / Financial</option>
                <option value="privacy">Privacy</option>
                <option value="safety">Safety Concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Severity *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["low", "medium", "high", "critical"] as const).map((sev) => (
                  <label
                    key={sev}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer border ${
                      formData.severity === sev
                        ? sev === "critical"
                          ? "bg-red-900/50 border-red-500 text-red-200"
                          : sev === "high"
                            ? "bg-orange-900/50 border-orange-500 text-orange-200"
                            : sev === "medium"
                              ? "bg-yellow-900/50 border-yellow-500 text-yellow-200"
                              : "bg-green-900/50 border-green-500 text-green-200"
                        : "bg-gray-700 border-gray-600 text-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={sev}
                      checked={formData.severity === sev}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                      className="sr-only"
                    />
                    <span className="capitalize text-sm">{sev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Complaint Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              placeholder="Describe the complaint in detail. Include what happened, when, where, and who was involved..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Advocacy */}
          <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.advocacyOffered}
                onChange={(e) => setFormData({ ...formData, advocacyOffered: e.target.checked })}
                className="mt-1"
              />
              <div>
                <span className="text-white font-medium">Advocacy Offered</span>
                <p className="text-gray-400 text-sm mt-1">
                  NDIS Practice Standards require offering access to an independent advocate to assist with
                  the complaints process. Check this box to confirm advocacy support was offered.
                </p>
              </div>
            </label>
          </div>

          {/* Safety Warning */}
          {formData.category === "safety" && (
            <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
              <h4 className="text-red-200 font-semibold">Safety Concern Flagged</h4>
              <p className="text-red-300 text-sm mt-1">
                If this complaint involves risk of harm to a participant, you may need to report as an
                <strong> NDIS Reportable Incident</strong> to the NDIS Quality and Safeguards Commission.
              </p>
              <Link
                href="/incidents/new"
                className="inline-block mt-2 text-red-200 hover:text-white underline text-sm"
              >
                Report as Incident instead &rarr;
              </Link>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/compliance"
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || !formData.complainantType || !formData.category}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg"
            >
              {isSaving ? "Saving..." : "Log Complaint"}
            </button>
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
