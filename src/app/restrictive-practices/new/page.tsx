"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";

const REVIEW_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "6_monthly", label: "Every 6 months" },
  { value: "annually", label: "Annually" },
];

function calculateNextReview(frequency: string, fromDate: string): string {
  const date = new Date(fromDate);
  switch (frequency) {
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "6_monthly": date.setMonth(date.getMonth() + 6); break;
    case "annually": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split("T")[0];
}

export default function NewRestrictivePracticePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const participants = useQuery(api.participants.getAll, userId ? { userId } : "skip");
  const properties = useQuery(api.properties.getAll, userId ? { userId } : "skip");
  const allUsers = useQuery(api.auth.getAllUsers, userId ? { userId } : "skip");
  const createPractice = useMutation(api.restrictivePractices.create);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    participantId: "",
    propertyId: "",
    practiceType: "environmental" as "environmental" | "chemical" | "mechanical" | "physical" | "seclusion",
    description: "",
    authorisedBy: "",
    authorisationDate: today,
    authorisationExpiry: "",
    behaviourSupportPlanId: "",
    implementedBy: "",
    startDate: today,
    endDate: "",
    reviewFrequency: "quarterly" as "monthly" | "quarterly" | "6_monthly" | "annually",
    nextReviewDate: calculateNextReview("quarterly", today),
    reductionStrategy: "",
    ndisReportable: false,
    isAuthorised: true,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate next review date when frequency or start date changes
      if (field === "reviewFrequency" || field === "startDate") {
        const freq = field === "reviewFrequency" ? (value as string) : updated.reviewFrequency;
        const start = field === "startDate" ? (value as string) : updated.startDate;
        updated.nextReviewDate = calculateNextReview(freq, start);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.participantId || !formData.propertyId) {
        throw new Error("Participant and property are required");
      }
      if (!formData.description.trim()) {
        throw new Error("Description is required");
      }
      if (!formData.reductionStrategy.trim()) {
        throw new Error("Reduction/elimination strategy is required");
      }

      const id = await createPractice({
        userId: user.id as Id<"users">,
        participantId: formData.participantId as Id<"participants">,
        propertyId: formData.propertyId as Id<"properties">,
        practiceType: formData.practiceType,
        description: formData.description,
        authorisedBy: formData.authorisedBy,
        authorisationDate: formData.authorisationDate,
        authorisationExpiry: formData.authorisationExpiry || calculateNextReview("annually", formData.authorisationDate),
        behaviourSupportPlanId: formData.behaviourSupportPlanId || undefined,
        implementedBy: formData.implementedBy ? (formData.implementedBy as Id<"users">) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        reviewFrequency: formData.reviewFrequency,
        nextReviewDate: formData.nextReviewDate,
        reductionStrategy: formData.reductionStrategy,
        ndisReportable: formData.ndisReportable,
        isAuthorised: formData.isAuthorised,
      });

      router.push(`/restrictive-practices/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeParticipants = participants?.filter((p) => p.status === "active" || p.status === "pending_move_in") || [];
  const activeProperties = properties?.filter((p) => p.isActive) || [];

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link href="/restrictive-practices" className="text-teal-400 hover:text-teal-300 text-sm mb-2 inline-block">
              &larr; Back to Register
            </Link>
            <h1 className="text-2xl font-bold text-white">Record Restrictive Practice</h1>
            <p className="text-gray-400 mt-1">
              Under NDIS Practice Standards, all restrictive practices must be recorded, authorised by a behaviour support practitioner, and reported to the NDIS Commission.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              <div>
                <h3 className="text-yellow-400 font-medium">NDIS Compliance Requirement</h3>
                <p className="text-yellow-300/80 text-sm mt-1">
                  Restrictive practices must only be used as a last resort, in accordance with a behaviour support plan, and with appropriate authorisation. All use must be reported to the NDIS Commission.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Participant & Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Participant *</label>
                <select
                  value={formData.participantId}
                  onChange={(e) => handleChange("participantId", e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select participant</option>
                  {activeParticipants.map((p) => (
                    <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Property *</label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => handleChange("propertyId", e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select property</option>
                  {activeProperties.map((p) => (
                    <option key={p._id} value={p._id}>{p.addressLine1}, {p.suburb}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Practice Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Practice Type *</label>
              <select
                value={formData.practiceType}
                onChange={(e) => handleChange("practiceType", e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="environmental">Environmental (restricting access to areas/objects)</option>
                <option value="chemical">Chemical (medication to control behaviour)</option>
                <option value="mechanical">Mechanical (device to restrict movement)</option>
                <option value="physical">Physical (bodily contact to restrict movement)</option>
                <option value="seclusion">Seclusion (confinement in room/space)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description of Practice *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                required
                rows={3}
                placeholder="Describe the restrictive practice in detail..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Authorisation */}
            <fieldset className="border border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-medium text-gray-300 px-2">Authorisation</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Authorised By (Practitioner) *</label>
                  <input
                    type="text"
                    value={formData.authorisedBy}
                    onChange={(e) => handleChange("authorisedBy", e.target.value)}
                    required
                    placeholder="Name of behaviour support practitioner"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Authorisation Date *</label>
                  <input
                    type="date"
                    value={formData.authorisationDate}
                    onChange={(e) => handleChange("authorisationDate", e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Authorisation Expiry</label>
                  <input
                    type="date"
                    value={formData.authorisationExpiry}
                    onChange={(e) => handleChange("authorisationExpiry", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">BSP Reference</label>
                  <input
                    type="text"
                    value={formData.behaviourSupportPlanId}
                    onChange={(e) => handleChange("behaviourSupportPlanId", e.target.value)}
                    placeholder="Behaviour Support Plan reference"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAuthorised}
                    onChange={(e) => handleChange("isAuthorised", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-300">This practice has valid authorisation</span>
                </label>
              </div>
            </fieldset>

            {/* Dates & Review */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Review Frequency *</label>
                <select
                  value={formData.reviewFrequency}
                  onChange={(e) => handleChange("reviewFrequency", e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REVIEW_FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Next Review Date</label>
                <input
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={(e) => handleChange("nextReviewDate", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Implemented By */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Implemented By</label>
              <select
                value={formData.implementedBy}
                onChange={(e) => handleChange("implementedBy", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select staff member</option>
                {allUsers?.filter((u) => u.isActive).map((u) => (
                  <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>

            {/* Reduction Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Reduction/Elimination Strategy *</label>
              <textarea
                value={formData.reductionStrategy}
                onChange={(e) => handleChange("reductionStrategy", e.target.value)}
                required
                rows={3}
                placeholder="Describe the plan to reduce or eliminate this restrictive practice..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* NDIS Reporting */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ndisReportable}
                  onChange={(e) => handleChange("ndisReportable", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-300">This practice is NDIS reportable</span>
              </label>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? "Recording..." : "Record Practice"}
              </button>
              <Link
                href="/restrictive-practices"
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}
