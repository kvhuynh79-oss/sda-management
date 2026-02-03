"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function EditParticipantPage() {
  const router = useRouter();
  const params = useParams();
  const participantId = params.id as Id<"participants">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"participant" | "plan">("participant");

  // Load participant data
  const participant = useQuery(api.participants.getById, { participantId });
  const allDwellings = useQuery(api.dwellings.getAllWithAddresses);

  const updateParticipant = useMutation(api.participants.update);
  const updatePlan = useMutation(api.participantPlans.update);

  // Participant form state
  const [participantData, setParticipantData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    dwellingId: "" as string,
    silProviderName: "",
    supportCoordinatorName: "",
    supportCoordinatorEmail: "",
    supportCoordinatorPhone: "",
    notes: "",
  });

  // Plan form state
  const [planData, setPlanData] = useState({
    planStartDate: "",
    planEndDate: "",
    sdaEligibilityType: "standard",
    sdaDesignCategory: "high_physical_support",
    sdaBuildingType: "new_build",
    fundingManagementType: "ndia_managed",
    planManagerName: "",
    planManagerEmail: "",
    planManagerPhone: "",
    annualSdaBudget: "",
    monthlySdaAmount: "",
    claimDay: "",
    reasonableRentContribution: "",
    rentContributionFrequency: "fortnightly",
    notes: "",
  });

  const [currentPlanId, setCurrentPlanId] = useState<Id<"participantPlans"> | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Load participant data into form
  useEffect(() => {
    if (participant) {
      setParticipantData({
        firstName: participant.firstName || "",
        lastName: participant.lastName || "",
        dateOfBirth: participant.dateOfBirth || "",
        email: participant.email || "",
        phone: participant.phone || "",
        emergencyContactName: participant.emergencyContactName || "",
        emergencyContactPhone: participant.emergencyContactPhone || "",
        emergencyContactRelation: participant.emergencyContactRelation || "",
        dwellingId: participant.dwellingId || "",
        silProviderName: participant.silProviderName || "",
        supportCoordinatorName: participant.supportCoordinatorName || "",
        supportCoordinatorEmail: participant.supportCoordinatorEmail || "",
        supportCoordinatorPhone: participant.supportCoordinatorPhone || "",
        notes: participant.notes || "",
      });

      // Load current plan if exists
      const currentPlan = participant.plans?.find((p) => p.planStatus === "current");
      if (currentPlan) {
        setCurrentPlanId(currentPlan._id);
        setPlanData({
          planStartDate: currentPlan.planStartDate || "",
          planEndDate: currentPlan.planEndDate || "",
          sdaEligibilityType: currentPlan.sdaEligibilityType || "standard",
          sdaDesignCategory: currentPlan.sdaDesignCategory || "high_physical_support",
          sdaBuildingType: currentPlan.sdaBuildingType || "new_build",
          fundingManagementType: currentPlan.fundingManagementType || "ndia_managed",
          planManagerName: currentPlan.planManagerName || "",
          planManagerEmail: currentPlan.planManagerEmail || "",
          planManagerPhone: currentPlan.planManagerPhone || "",
          annualSdaBudget: currentPlan.annualSdaBudget?.toString() || "",
          monthlySdaAmount: currentPlan.monthlySdaAmount?.toString() || "",
          claimDay: currentPlan.claimDay?.toString() || "",
          reasonableRentContribution: currentPlan.reasonableRentContribution?.toString() || "",
          rentContributionFrequency: currentPlan.rentContributionFrequency || "fortnightly",
          notes: currentPlan.notes || "",
        });
      }
    }
  }, [participant]);

  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await updateParticipant({
        userId: user?.id as Id<"users">,
        participantId,
        firstName: participantData.firstName,
        lastName: participantData.lastName,
        dateOfBirth: participantData.dateOfBirth || undefined,
        email: participantData.email || undefined,
        phone: participantData.phone || undefined,
        emergencyContactName: participantData.emergencyContactName || undefined,
        emergencyContactPhone: participantData.emergencyContactPhone || undefined,
        emergencyContactRelation: participantData.emergencyContactRelation || undefined,
        dwellingId: participantData.dwellingId ? participantData.dwellingId as Id<"dwellings"> : undefined,
        silProviderName: participantData.silProviderName || undefined,
        supportCoordinatorName: participantData.supportCoordinatorName || undefined,
        supportCoordinatorEmail: participantData.supportCoordinatorEmail || undefined,
        supportCoordinatorPhone: participantData.supportCoordinatorPhone || undefined,
        notes: participantData.notes || undefined,
      });

      router.push(`/participants/${participantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update participant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlanId) {
      setError("No current plan to update");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await updatePlan({
        planId: currentPlanId,
        planStartDate: planData.planStartDate,
        planEndDate: planData.planEndDate,
        sdaEligibilityType: planData.sdaEligibilityType as "standard" | "higher_needs",
        sdaDesignCategory: planData.sdaDesignCategory as
          | "improved_liveability"
          | "fully_accessible"
          | "robust"
          | "high_physical_support",
        sdaBuildingType: planData.sdaBuildingType as "new_build" | "existing",
        fundingManagementType: planData.fundingManagementType as
          | "ndia_managed"
          | "plan_managed"
          | "self_managed",
        planManagerName: planData.planManagerName || undefined,
        planManagerEmail: planData.planManagerEmail || undefined,
        planManagerPhone: planData.planManagerPhone || undefined,
        annualSdaBudget: parseFloat(planData.annualSdaBudget) || undefined,
        monthlySdaAmount: parseFloat(planData.monthlySdaAmount) || undefined,
        claimDay: planData.claimDay ? parseInt(planData.claimDay) : undefined,
        reasonableRentContribution: planData.reasonableRentContribution
          ? parseFloat(planData.reasonableRentContribution)
          : undefined,
        rentContributionFrequency: planData.rentContributionFrequency as
          | "weekly"
          | "fortnightly"
          | "monthly"
          | undefined,
        notes: planData.notes || undefined,
      });

      router.push(`/participants/${participantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !participant) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="participants" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/participants/${participantId}`}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            &larr; Back to {participant.firstName} {participant.lastName}
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Participant</h1>
          <p className="text-gray-400 mt-1">
            {participant.firstName} {participant.lastName} - NDIS: {participant.ndisNumber}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("participant")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "participant"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Participant Details
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "plan"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            NDIS Plan
          </button>
        </div>

        {/* Participant Form */}
        {activeTab === "participant" && (
          <form onSubmit={handleParticipantSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">First Name *</label>
                  <input
                    type="text"
                    value={participantData.firstName}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, firstName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={participantData.lastName}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, lastName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={participantData.dateOfBirth}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, dateOfBirth: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={participantData.email}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Phone</label>
                  <input
                    type="tel"
                    value={participantData.phone}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Residence */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Residence</h2>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Dwelling *</label>
                <select
                  value={participantData.dwellingId}
                  onChange={(e) =>
                    setParticipantData({ ...participantData, dwellingId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Select a dwelling...</option>
                  {allDwellings?.map((dwelling) => (
                    <option key={dwelling._id} value={dwelling._id}>
                      {dwelling.fullAddress} - {dwelling.dwellingName}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1">
                  Select the dwelling where this participant resides
                </p>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={participantData.emergencyContactName}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        emergencyContactName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={participantData.emergencyContactPhone}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Relationship</label>
                  <input
                    type="text"
                    value={participantData.emergencyContactRelation}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        emergencyContactRelation: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Support Services */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Support Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">SIL Provider Name</label>
                  <input
                    type="text"
                    value={participantData.silProviderName}
                    onChange={(e) =>
                      setParticipantData({ ...participantData, silProviderName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Support Coordinator Name
                  </label>
                  <input
                    type="text"
                    value={participantData.supportCoordinatorName}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        supportCoordinatorName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Support Coordinator Email
                  </label>
                  <input
                    type="email"
                    value={participantData.supportCoordinatorEmail}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        supportCoordinatorEmail: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Support Coordinator Phone
                  </label>
                  <input
                    type="tel"
                    value={participantData.supportCoordinatorPhone}
                    onChange={(e) =>
                      setParticipantData({
                        ...participantData,
                        supportCoordinatorPhone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
              <textarea
                value={participantData.notes}
                onChange={(e) => setParticipantData({ ...participantData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link
                href={`/participants/${participantId}`}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Participant"}
              </button>
            </div>
          </form>
        )}

        {/* Plan Form */}
        {activeTab === "plan" && (
          <form onSubmit={handlePlanSubmit} className="space-y-6">
            {!currentPlanId && (
              <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 text-yellow-300">
                No current plan found. You can add a new plan from the participant detail page.
              </div>
            )}

            {currentPlanId && (
              <>
                {/* Plan Period */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">NDIS Plan Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Plan Start Date *</label>
                      <input
                        type="date"
                        value={planData.planStartDate}
                        onChange={(e) =>
                          setPlanData({ ...planData, planStartDate: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Plan End Date *</label>
                      <input
                        type="date"
                        value={planData.planEndDate}
                        onChange={(e) => setPlanData({ ...planData, planEndDate: e.target.value })}
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">SDA Eligibility Type</label>
                      <select
                        value={planData.sdaEligibilityType}
                        onChange={(e) =>
                          setPlanData({ ...planData, sdaEligibilityType: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="standard">Standard</option>
                        <option value="higher_needs">Higher Needs</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Design Category</label>
                      <select
                        value={planData.sdaDesignCategory}
                        onChange={(e) =>
                          setPlanData({ ...planData, sdaDesignCategory: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="improved_liveability">Improved Liveability</option>
                        <option value="fully_accessible">Fully Accessible</option>
                        <option value="robust">Robust</option>
                        <option value="high_physical_support">High Physical Support</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Building Type</label>
                      <select
                        value={planData.sdaBuildingType}
                        onChange={(e) =>
                          setPlanData({ ...planData, sdaBuildingType: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="new_build">New Build</option>
                        <option value="existing">Existing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Funding Management</label>
                      <select
                        value={planData.fundingManagementType}
                        onChange={(e) =>
                          setPlanData({ ...planData, fundingManagementType: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="ndia_managed">NDIA Managed</option>
                        <option value="plan_managed">Plan Managed</option>
                        <option value="self_managed">Self Managed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan Manager (conditional) */}
                {planData.fundingManagementType === "plan_managed" && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Plan Manager Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Plan Manager Name</label>
                        <input
                          type="text"
                          value={planData.planManagerName}
                          onChange={(e) =>
                            setPlanData({ ...planData, planManagerName: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">
                          Plan Manager Email
                        </label>
                        <input
                          type="email"
                          value={planData.planManagerEmail}
                          onChange={(e) =>
                            setPlanData({ ...planData, planManagerEmail: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">
                          Plan Manager Phone
                        </label>
                        <input
                          type="tel"
                          value={planData.planManagerPhone}
                          onChange={(e) =>
                            setPlanData({ ...planData, planManagerPhone: e.target.value })
                          }
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SDA Funding */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">SDA Funding</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">
                        Monthly SDA Amount ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={planData.monthlySdaAmount}
                        onChange={(e) =>
                          setPlanData({ ...planData, monthlySdaAmount: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                      <p className="text-gray-500 text-xs mt-1">From NDIS plan funding schedule</p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">
                        Annual Budget ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={planData.annualSdaBudget}
                        onChange={(e) =>
                          setPlanData({ ...planData, annualSdaBudget: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">Claim Day of Month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={planData.claimDay}
                        onChange={(e) => setPlanData({ ...planData, claimDay: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                      <p className="text-gray-500 text-xs mt-1">Day when claims are due (1-31)</p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">
                        Rent Contribution ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={planData.reasonableRentContribution}
                        onChange={(e) =>
                          setPlanData({ ...planData, reasonableRentContribution: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-1">
                        Contribution Frequency
                      </label>
                      <select
                        value={planData.rentContributionFrequency}
                        onChange={(e) =>
                          setPlanData({ ...planData, rentContributionFrequency: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan Notes */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Plan Notes</h2>
                  <textarea
                    value={planData.notes}
                    onChange={(e) => setPlanData({ ...planData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Link
                    href={`/participants/${participantId}`}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Plan"}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
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
