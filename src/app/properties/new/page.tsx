"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

export default function NewPropertyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Owner, 2: Property, 3: Dwelling
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Owner form state
  const [ownerType, setOwnerType] = useState<"self" | "individual" | "company" | "trust">("self");
  const [ownerData, setOwnerData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    abn: "",
    bankBsb: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [createNewOwner, setCreateNewOwner] = useState(true);

  // Property form state
  const [propertyData, setPropertyData] = useState({
    propertyName: "",
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    state: "NSW" as typeof STATES[number],
    postcode: "",
    revenueSharePercent: "",
    managementFeePercent: "",
    notes: "",
  });

  // Dwelling form state
  type DwellingForm = {
    dwellingName: string;
    dwellingType: "house" | "villa" | "apartment" | "unit";
    bedrooms: number;
    bathrooms: number;
    sdaDesignCategory: "improved_liveability" | "fully_accessible" | "robust" | "high_physical_support";
    sdaBuildingType: "new_build" | "existing";
    registrationDate: string;
    maxParticipants: number;
  };

  const [dwellings, setDwellings] = useState<DwellingForm[]>([
    {
      dwellingName: "Main House",
      dwellingType: "house",
      bedrooms: 3,
      bathrooms: 2,
      sdaDesignCategory: "high_physical_support",
      sdaBuildingType: "new_build",
      registrationDate: "",
      maxParticipants: 3,
    },
  ]);

  const owners = useQuery(api.owners.getAll);
  const createOwner = useMutation(api.owners.create);
  const createProperty = useMutation(api.properties.create);
  const createDwelling = useMutation(api.dwellings.create);

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
      // Step 1: Create or select owner
      let ownerId: string;
      
      if (createNewOwner) {
        ownerId = await createOwner({
          ownerType,
          firstName: ownerType === "individual" ? ownerData.firstName : undefined,
          lastName: ownerType === "individual" ? ownerData.lastName : undefined,
          companyName: ownerType === "company" || ownerType === "trust" ? ownerData.companyName : undefined,
          email: ownerData.email || "self@example.com",
          phone: ownerData.phone || undefined,
          abn: ownerData.abn || undefined,
          bankBsb: ownerData.bankBsb || undefined,
          bankAccountNumber: ownerData.bankAccountNumber || undefined,
          bankAccountName: ownerData.bankAccountName || undefined,
        });
      } else {
        if (!selectedOwnerId) {
          throw new Error("Please select an owner");
        }
        ownerId = selectedOwnerId;
      }

      // Step 2: Create property
      const propertyId = await createProperty({
        propertyName: propertyData.propertyName || undefined,
        addressLine1: propertyData.addressLine1,
        addressLine2: propertyData.addressLine2 || undefined,
        suburb: propertyData.suburb,
        state: propertyData.state,
        postcode: propertyData.postcode,
        ownerId: ownerId as any,
        ownershipType: ownerType === "self" ? "self_owned" : "investor",
        revenueSharePercent: propertyData.revenueSharePercent
          ? parseFloat(propertyData.revenueSharePercent)
          : undefined,
        managementFeePercent: propertyData.managementFeePercent
          ? parseFloat(propertyData.managementFeePercent)
          : undefined,
        notes: propertyData.notes || undefined,
      });

      // Step 3: Create dwellings
      for (const dwelling of dwellings) {
        await createDwelling({
          propertyId: propertyId as any,
          ...dwelling,
        });
      }

      router.push("/properties");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create property");
    } finally {
      setIsLoading(false);
    }
  };

  const addDwelling = () => {
    setDwellings([
      ...dwellings,
      {
        dwellingName: `Dwelling ${dwellings.length + 1}`,
        dwellingType: "villa",
        bedrooms: 1,
        bathrooms: 1,
        sdaDesignCategory: "high_physical_support",
        sdaBuildingType: "new_build",
        registrationDate: "",
        maxParticipants: 1,
      },
    ]);
  };

  const removeDwelling = (index: number) => {
    if (dwellings.length > 1) {
      setDwellings(dwellings.filter((_, i) => i !== index));
    }
  };

  const updateDwelling = (index: number, field: string, value: any) => {
    const updated = [...dwellings];
    updated[index] = { ...updated[index], [field]: value };
    setDwellings(updated);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="properties" />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <Step number={1} label="Owner" active={step === 1} completed={step > 1} />
          <div className="w-16 h-1 bg-gray-700 mx-2" />
          <Step number={2} label="Property" active={step === 2} completed={step > 2} />
          <div className="w-16 h-1 bg-gray-700 mx-2" />
          <Step number={3} label="Dwellings" active={step === 3} completed={step > 3} />
        </div>

        <div className="bg-gray-800 rounded-lg p-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Owner */}
          {step === 1 && (
            <OwnerStep
              ownerType={ownerType}
              setOwnerType={setOwnerType}
              ownerData={ownerData}
              setOwnerData={setOwnerData}
              createNewOwner={createNewOwner}
              setCreateNewOwner={setCreateNewOwner}
              selectedOwnerId={selectedOwnerId}
              setSelectedOwnerId={setSelectedOwnerId}
              owners={owners || []}
              onNext={() => setStep(2)}
            />
          )}

          {/* Step 2: Property */}
          {step === 2 && (
            <PropertyStep
              propertyData={propertyData}
              setPropertyData={setPropertyData}
              ownerType={ownerType}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {/* Step 3: Dwellings */}
          {step === 3 && (
            <DwellingsStep
              dwellings={dwellings}
              addDwelling={addDwelling}
              removeDwelling={removeDwelling}
              updateDwelling={updateDwelling}
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

function OwnerStep({ 
  ownerType, setOwnerType, ownerData, setOwnerData, 
  createNewOwner, setCreateNewOwner, selectedOwnerId, setSelectedOwnerId,
  owners, onNext 
}: any) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Property Owner</h3>
      
      {owners.length > 0 && (
        <div className="mb-6">
          <label className="flex items-center gap-3 mb-4">
            <input
              type="radio"
              checked={createNewOwner}
              onChange={() => setCreateNewOwner(true)}
              className="w-4 h-4"
            />
            <span className="text-white">Create new owner</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={!createNewOwner}
              onChange={() => setCreateNewOwner(false)}
              className="w-4 h-4"
            />
            <span className="text-white">Select existing owner</span>
          </label>
        </div>
      )}

      {!createNewOwner && owners.length > 0 ? (
        <div className="space-y-3">
          {owners.map((owner: any) => (
            <label
              key={owner._id}
              className={`block p-4 rounded-lg border cursor-pointer transition-colors
                ${selectedOwnerId === owner._id 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-gray-600 hover:border-gray-500"}`}
            >
              <input
                type="radio"
                checked={selectedOwnerId === owner._id}
                onChange={() => setSelectedOwnerId(owner._id)}
                className="hidden"
              />
              <p className="text-white font-medium">
                {owner.companyName || `${owner.firstName} ${owner.lastName}`}
              </p>
              <p className="text-gray-400 text-sm">{owner.email}</p>
            </label>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Owner Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: "self", label: "Self (I own it)" },
                { value: "individual", label: "Individual" },
                { value: "company", label: "Company" },
                { value: "trust", label: "Trust" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOwnerType(type.value)}
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors
                    ${ownerType === type.value 
                      ? "border-blue-500 bg-blue-500/10 text-white" 
                      : "border-gray-600 text-gray-300 hover:border-gray-500"}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {ownerType !== "self" && (
            <div className="space-y-4">
              {ownerType === "individual" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={ownerData.firstName}
                      onChange={(e) => setOwnerData({ ...ownerData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={ownerData.lastName}
                      onChange={(e) => setOwnerData({ ...ownerData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {ownerType === "company" ? "Company Name" : "Trust Name"}
                  </label>
                  <input
                    type="text"
                    value={ownerData.companyName}
                    onChange={(e) => setOwnerData({ ...ownerData, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={ownerData.email}
                  onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={ownerData.phone}
                    onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ABN (optional)</label>
                  <input
                    type="text"
                    value={ownerData.abn}
                    onChange={(e) => setOwnerData({ ...ownerData, abn: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h4 className="text-sm font-medium text-gray-200 mb-4">Bank Details (for payment distributions)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Account Name</label>
                    <input
                      type="text"
                      value={ownerData.bankAccountName}
                      onChange={(e) => setOwnerData({ ...ownerData, bankAccountName: e.target.value })}
                      placeholder="e.g., John Smith or ABC Pty Ltd"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">BSB</label>
                      <input
                        type="text"
                        value={ownerData.bankBsb}
                        onChange={(e) => setOwnerData({ ...ownerData, bankBsb: e.target.value })}
                        placeholder="e.g., 062-000"
                        maxLength={7}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                      <input
                        type="text"
                        value={ownerData.bankAccountNumber}
                        onChange={(e) => setOwnerData({ ...ownerData, bankAccountNumber: e.target.value })}
                        placeholder="e.g., 12345678"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Next: Property Details
        </button>
      </div>
    </div>
  );
}

function PropertyStep({ propertyData, setPropertyData, ownerType, onBack, onNext }: any) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Property Details</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Property Name (optional)
          </label>
          <input
            type="text"
            value={propertyData.propertyName}
            onChange={(e) => setPropertyData({ ...propertyData, propertyName: e.target.value })}
            placeholder="e.g., Sunrise House"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
          <input
            type="text"
            value={propertyData.addressLine1}
            onChange={(e) => setPropertyData({ ...propertyData, addressLine1: e.target.value })}
            required
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Address Line 2 (optional)
          </label>
          <input
            type="text"
            value={propertyData.addressLine2}
            onChange={(e) => setPropertyData({ ...propertyData, addressLine2: e.target.value })}
            placeholder="Unit, suite, etc."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Suburb *</label>
            <input
              type="text"
              value={propertyData.suburb}
              onChange={(e) => setPropertyData({ ...propertyData, suburb: e.target.value })}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
            <select
              value={propertyData.state}
              onChange={(e) => setPropertyData({ ...propertyData, state: e.target.value })}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"].map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Postcode *</label>
            <input
              type="text"
              value={propertyData.postcode}
              onChange={(e) => setPropertyData({ ...propertyData, postcode: e.target.value })}
              required
              maxLength={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        {ownerType !== "self" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Revenue Share % (Investor)
            </label>
            <input
              type="number"
              value={propertyData.revenueSharePercent}
              onChange={(e) => setPropertyData({ ...propertyData, revenueSharePercent: e.target.value })}
              placeholder="e.g., 80"
              min="0"
              max="100"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Management Fee %
          </label>
          <input
            type="number"
            value={propertyData.managementFeePercent}
            onChange={(e) => setPropertyData({ ...propertyData, managementFeePercent: e.target.value })}
            placeholder="e.g., 30"
            min="0"
            max="100"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
          />
          <p className="text-gray-500 text-xs mt-1">% kept as management fee for owner distributions</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
          <textarea
            value={propertyData.notes}
            onChange={(e) => setPropertyData({ ...propertyData, notes: e.target.value })}
            rows={3}
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
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Next: Add Dwellings
        </button>
      </div>
    </div>
  );
}

function DwellingsStep({ dwellings, addDwelling, removeDwelling, updateDwelling, onBack, onSubmit, isLoading }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Dwellings</h3>
        <button
          onClick={addDwelling}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
        >
          + Add Another Dwelling
        </button>
      </div>

      <div className="space-y-6">
        {dwellings.map((dwelling: any, index: number) => (
          <div key={index} className="bg-gray-700/50 rounded-lg p-5 border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-medium">Dwelling {index + 1}</h4>
              {dwellings.length > 1 && (
                <button
                  onClick={() => removeDwelling(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={dwelling.dwellingName}
                  onChange={(e) => updateDwelling(index, "dwellingName", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={dwelling.dwellingType}
                  onChange={(e) => updateDwelling(index, "dwellingType", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="unit">Unit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bedrooms</label>
                <input
                  type="number"
                  value={dwelling.bedrooms}
                  onChange={(e) => updateDwelling(index, "bedrooms", parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
                <input
                  type="number"
                  value={dwelling.maxParticipants}
                  onChange={(e) => updateDwelling(index, "maxParticipants", parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SDA Design Category</label>
                <select
                  value={dwelling.sdaDesignCategory}
                  onChange={(e) => updateDwelling(index, "sdaDesignCategory", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="improved_liveability">Improved Liveability</option>
                  <option value="fully_accessible">Fully Accessible</option>
                  <option value="robust">Robust</option>
                  <option value="high_physical_support">High Physical Support</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Building Type</label>
                <select
                  value={dwelling.sdaBuildingType}
                  onChange={(e) => updateDwelling(index, "sdaBuildingType", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                >
                  <option value="new_build">New Build</option>
                  <option value="existing">Existing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Registration Date</label>
                <input
                  type="date"
                  value={dwelling.registrationDate}
                  onChange={(e) => updateDwelling(index, "registrationDate", e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>
        ))}
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
          disabled={isLoading}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg transition-colors"
        >
          {isLoading ? "Creating..." : "Create Property"}
        </button>
      </div>
    </div>
  );
}

