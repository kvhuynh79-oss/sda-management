"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewParticipantPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Participant data
  const [participantData, setParticipantData] = useState({
    ndisNumber: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    silProviderName: "",
    supportCoordinatorName: "",
    supportCoordinatorEmail: "",
    supportCoordinatorPhone: "",
    notes: "",
  });

  // Dwelling selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedDwellingId, setSelectedDwellingId] = useState<string | null>(null);
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split("T")[0]);

  // Plan data
  const [planData, setPlanData] = useState({
    planStartDate: new Date().toISOString().split("T")[0],
    planEndDate: "",
    sdaEligibilityType: "standard" as const,
    sdaDesignCategory: "high_physical_support" as const,
    sdaBuildingType: "new_build" as const,
    fundingManagementType: "ndia_managed" as const,
    planManagerName: "",
    planManagerEmail: "",
    planManagerPhone: "",
    annualSdaBudget: "",
    dailySdaRate: "",
    reasonableRentContribution: "",
    notes: "",
  });

  const properties = useQuery(api.properties.getAll);
  const selectedProperty = properties?.find((p) => p._id === selectedPropertyId);
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyId ? { propertyId: selectedPropertyId as any } : "skip"
  );

  const createParticipant = useMutation(api.participants.create);
  const createPlan = useMutation(api.participantPlans.create);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
    }
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);

    try {
      if (!selectedDwellingId) {
        throw new Error("Please select a dwelling");
      }

      // Create participant
      const participantId = await createParticipant({
        ndisNumber: participantData.ndisNumber,
        firstName: participantData.firstName,
        lastName: participantData.lastName,
        dateOfBirth: participantData.dateOfBirth || undefined,
        email: participantData.email || undefined,
        phone: participantData.phone || undefined,
        emergencyContactName: participantData.emergencyContactName || undefined,
        emergencyContactPhone: participantData.emergencyContactPhone || undefined,
        emergencyContactRelation: participantData.emergencyContactRelation || undefined,
        dwellingId: selectedDwellingId as any,
        moveInDate,
        silProviderName: participantData.silProviderName || undefined,
        supportCoordinatorName: participantData.supportCoordinatorName || undefined,
        supportCoordinatorEmail: participantData.supportCoordinatorEmail || undefined,
        supportCoordinatorPhone: participantData.supportCoordinatorPhone || undefined,
        notes: participantData.notes || undefined,
      });

      // Create plan
      await createPlan({
        participantId: participantId as any,
        planStartDate: planData.planStartDate,
        planEndDate: planData.planEndDate,
        sdaEligibilityType: planData.sdaEligibilityType,
        sdaDesignCategory: planData.sdaDesignCategory,
        sdaBuildingType: planData.sdaBuildingType,
        fundingManagementType: planData.fundingManagementType,
        planManagerName: planData.planManagerName || undefined,
        planManagerEmail: planData.planManagerEmail || undefined,
        planManagerPhone: planData.planManagerPhone || undefined,
        annualSdaBudget: parseFloat(planData.annualSdaBudget) || 0,
        dailySdaRate: parseFloat(planData.dailySdaRate) || 0,
        reasonableRentContribution: planData.reasonableRentContribution 
          ? parseFloat(planData.reasonableRentContribution) 
          : undefined,
        notes: planData.notes || undefined,
      });

      router.push("/participants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create participant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <Step number={1} label="Details" active={step === 1} completed={step > 1} />
          <div className="w-16 h-1 bg-gray-700 mx-2" />
          <Step number={2} label="Dwelling" active={step === 2} completed={step > 2} />
          <div className="w-16 h-1 bg-gray-700 mx-2" />
          <Step number={3} label="NDIS Plan" active={step === 3} completed={step > 3} />
        </div>

        <div className="bg-gray-800 rounded-lg p-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {step === 1 && (
            <ParticipantDetailsStep
              data={participantData}
              setData={setParticipantData}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <DwellingSelectionStep
              properties={properties || []}
              dwellings={dwellings || []}
              selectedPropertyId={selectedPropertyId}
              setSelectedPropertyId={setSelectedPropertyId}
              selectedDwellingId={selectedDwellingId}
              setSelectedDwellingId={setSelectedDwellingId}
              moveInDate={moveInDate}
              setMoveInDate={setMoveInDate}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <PlanStep
              data={planData}
              setData={setPlanData}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Step({ number, label, active, completed }: { 
  number: number; 
  label: string; 
  active: boolean; 
  completed: boolean;
}) {
  return (
    <div className="flex items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${active ? "bg-blue-600 text-white" : completed ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"}`}>
        {completed ? "✓" : number}
      </div>
      <span className={`ml-2 ${active ? "text-white" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

function ParticipantDetailsStep({ data, setData, onNext }: any) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Participant Details</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">NDIS Number *</label>
          <input
            type="text"
            value={data.ndisNumber}
            onChange={(e) => setData({ ...data, ndisNumber: e.target.value })}
            placeholder="e.g., 431234567"
            required
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => setData({ ...data, lastName: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</label>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-lg font-medium text-white mb-4">Emergency Contact</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={data.emergencyContactName}
                onChange={(e) => setData({ ...data, emergencyContactName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={data.emergencyContactPhone}
                onChange={(e) => setData({ ...data, emergencyContactPhone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Relationship</label>
              <input
                type="text"
                value={data.emergencyContactRelation}
                onChange={(e) => setData({ ...data, emergencyContactRelation: e.target.value })}
                placeholder="e.g., Parent, Sibling"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-lg font-medium text-white mb-4">Support Details</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">SIL Provider</label>
              <input
                type="text"
                value={data.silProviderName}
                onChange={(e) => setData({ ...data, silProviderName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Support Coordinator</label>
                <input
                  type="text"
                  value={data.supportCoordinatorName}
                  onChange={(e) => setData({ ...data, supportCoordinatorName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SC Email</label>
                <input
                  type="email"
                  value={data.supportCoordinatorEmail}
                  onChange={(e) => setData({ ...data, supportCoordinatorEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SC Phone</label>
                <input
                  type="tel"
                  value={data.supportCoordinatorPhone}
                  onChange={(e) => setData({ ...data, supportCoordinatorPhone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!data.ndisNumber || !data.firstName || !data.lastName}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Next: Select Dwelling
        </button>
      </div>
    </div>
  );
}

function DwellingSelectionStep({ 
  properties, dwellings, selectedPropertyId, setSelectedPropertyId,
  selectedDwellingId, setSelectedDwellingId, moveInDate, setMoveInDate,
  onBack, onNext 
}: any) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Select Dwelling</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Property *</label>
          <select
            value={selectedPropertyId || ""}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value || null);
              setSelectedDwellingId(null);
            }}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="">Select a property...</option>
            {properties.map((property: any) => (
              <option key={property._id} value={property._id}>
                {property.propertyName || property.addressLine1} - {property.suburb}, {property.state}
              </option>
            ))}
          </select>
        </div>

        {selectedPropertyId && dwellings && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dwelling *</label>
            <div className="space-y-3">
              {dwellings.map((dwelling: any) => {
                const availableSpaces = dwelling.maxParticipants - dwelling.currentOccupancy;
                const isAvailable = availableSpaces > 0;

                return (
                  <label
                    key={dwelling._id}
                    className={`block p-4 rounded-lg border cursor-pointer transition-colors
                      ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                      ${selectedDwellingId === dwelling._id 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-gray-600 hover:border-gray-500"}`}
                  >
                    <input
                      type="radio"
                      checked={selectedDwellingId === dwelling._id}
                      onChange={() => isAvailable && setSelectedDwellingId(dwelling._id)}
                      disabled={!isAvailable}
                      className="hidden"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">{dwelling.dwellingName}</p>
                        <p className="text-gray-400 text-sm">
                          {dwelling.dwellingType} • {dwelling.bedrooms} bed • {dwelling.sdaDesignCategory.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm ${isAvailable ? "text-green-400" : "text-red-400"}`}>
                          {availableSpaces} / {dwelling.maxParticipants} available
                        </span>
                      </div>
                    </div>
                    {dwelling.participants?.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        Current: {dwelling.participants.map((p: any) => `${p.firstName} ${p.lastName}`).join(", ")}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Move-in Date *</label>
          <input
            type="date"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedDwellingId}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Next: NDIS Plan
        </button>
      </div>
    </div>
  );
}

function PlanStep({ data, setData, onBack, onSubmit, isLoading }: any) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">NDIS Plan Details</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan Start Date *</label>
            <input
              type="date"
              value={data.planStartDate}
              onChange={(e) => setData({ ...data, planStartDate: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan End Date *</label>
            <input
              type="date"
              value={data.planEndDate}
              onChange={(e) => setData({ ...data, planEndDate: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">SDA Eligibility Type</label>
            <select
              value={data.sdaEligibilityType}
              onChange={(e) => setData({ ...data, sdaEligibilityType: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="standard">Standard</option>
              <option value="higher_needs">Higher Needs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Design Category</label>
            <select
              value={data.sdaDesignCategory}
              onChange={(e) => setData({ ...data, sdaDesignCategory: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="improved_liveability">Improved Liveability</option>
              <option value="fully_accessible">Fully Accessible</option>
              <option value="robust">Robust</option>
              <option value="high_physical_support">High Physical Support</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Building Type</label>
            <select
              value={data.sdaBuildingType}
              onChange={(e) => setData({ ...data, sdaBuildingType: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="new_build">New Build</option>
              <option value="existing">Existing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Funding Management</label>
            <select
              value={data.fundingManagementType}
              onChange={(e) => setData({ ...data, fundingManagementType: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="ndia_managed">NDIA Managed</option>
              <option value="plan_managed">Plan Managed</option>
              <option value="self_managed">Self Managed</option>
            </select>
          </div>
        </div>

        {data.fundingManagementType === "plan_managed" && (
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h4 className="text-white font-medium">Plan Manager Details</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={data.planManagerName}
                  onChange={(e) => setData({ ...data, planManagerName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={data.planManagerEmail}
                  onChange={(e) => setData({ ...data, planManagerEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={data.planManagerPhone}
                  onChange={(e) => setData({ ...data, planManagerPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-700 pt-4 mt-4">
          <h4 className="text-lg font-medium text-white mb-4">SDA Funding</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Daily SDA Rate ($) *</label>
              <input
                type="number"
                value={data.dailySdaRate}
                onChange={(e) => setData({ ...data, dailySdaRate: e.target.value })}
                placeholder="e.g., 150.00"
                step="0.01"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Annual Budget ($) *</label>
              <input
                type="number"
                value={data.annualSdaBudget}
                onChange={(e) => setData({ ...data, annualSdaBudget: e.target.value })}
                placeholder="e.g., 54750"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rent Contribution ($)</label>
              <input
                type="number"
                value={data.reasonableRentContribution}
                onChange={(e) => setData({ ...data, reasonableRentContribution: e.target.value })}
                placeholder="Optional"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading || !data.planEndDate || !data.dailySdaRate || !data.annualSdaBudget}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isLoading ? "Creating..." : "Create Participant"}
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              SDA Management
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link href="/participants" className="text-white font-medium">
                Participants
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
