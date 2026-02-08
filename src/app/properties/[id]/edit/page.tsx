"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../../convex/_generated/dataModel";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

type DwellingForm = {
  _id: Id<"dwellings">;
  dwellingName: string;
  dwellingType: "house" | "villa" | "apartment" | "unit";
  bedrooms: number;
  bathrooms: number;
  sdaDesignCategory: "improved_liveability" | "fully_accessible" | "robust" | "high_physical_support";
  sdaBuildingType: "new_build" | "existing";
  registrationDate: string;
  maxParticipants: number;
};

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as Id<"properties">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const property = useQuery(api.properties.getById, { propertyId });
  const silProviders = useQuery(api.silProviders.getAll, { status: "active" });
  const updateProperty = useMutation(api.properties.update);
  const updateDwelling = useMutation(api.dwellings.update);
  const updateOwner = useMutation(api.owners.update);

  const [formData, setFormData] = useState({
    propertyName: "",
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    state: "NSW" as (typeof STATES)[number],
    postcode: "",
    propertyStatus: "active" as "active" | "under_construction" | "sil_property",
    expectedCompletionDate: "",
    silProviderId: "" as string,
    silProviderName: "", // Legacy field
    managementFeePercent: "",
    notes: "",
  });

  const [ownerData, setOwnerData] = useState({
    bankAccountName: "",
    bankBsb: "",
    bankAccountNumber: "",
  });

  const [dwellings, setDwellings] = useState<DwellingForm[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Load property data into form
  useEffect(() => {
    if (property) {
      setFormData({
        propertyName: property.propertyName || "",
        addressLine1: property.addressLine1 || "",
        addressLine2: property.addressLine2 || "",
        suburb: property.suburb || "",
        state: property.state || "NSW",
        postcode: property.postcode || "",
        propertyStatus: (property as any).propertyStatus || "active",
        expectedCompletionDate: (property as any).expectedCompletionDate || "",
        silProviderId: (property as any).silProviderId || "",
        silProviderName: (property as any).silProviderName || "", // Legacy
        managementFeePercent: property.managementFeePercent?.toString() || "",
        notes: property.notes || "",
      });

      // Load owner bank details
      if (property.owner) {
        setOwnerData({
          bankAccountName: property.owner.bankAccountName || "",
          bankBsb: property.owner.bankBsb || "",
          bankAccountNumber: property.owner.bankAccountNumber || "",
        });
      }

      // Load dwellings
      if (property.dwellings) {
        setDwellings(
          property.dwellings.map((d: any) => ({
            _id: d._id,
            dwellingName: d.dwellingName || "",
            dwellingType: d.dwellingType || "house",
            bedrooms: d.bedrooms || 1,
            bathrooms: d.bathrooms || 1,
            sdaDesignCategory: d.sdaDesignCategory || "high_physical_support",
            sdaBuildingType: d.sdaBuildingType || "new_build",
            registrationDate: d.registrationDate || "",
            maxParticipants: d.maxParticipants || 1,
          }))
        );
      }
    }
  }, [property]);

  const updateDwellingField = (index: number, field: keyof DwellingForm, value: any) => {
    const updated = [...dwellings];
    updated[index] = { ...updated[index], [field]: value };
    setDwellings(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Update property
      await updateProperty({
        userId: user!.id as Id<"users">,
        propertyId,
        propertyName: formData.propertyName || undefined,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        suburb: formData.suburb,
        state: formData.state,
        postcode: formData.postcode,
        propertyStatus: formData.propertyStatus,
        expectedCompletionDate: formData.expectedCompletionDate || undefined,
        silProviderId: formData.silProviderId ? formData.silProviderId as Id<"silProviders"> : undefined,
        silProviderName: formData.silProviderName || undefined, // Legacy
        managementFeePercent: formData.managementFeePercent
          ? parseFloat(formData.managementFeePercent)
          : undefined,
        notes: formData.notes || undefined,
      });

      // Update owner bank details if owner exists
      if (property?.owner?._id) {
        await updateOwner({
          userId: user?.id as Id<"users">,
          ownerId: property.owner._id,
          bankAccountName: ownerData.bankAccountName || undefined,
          bankBsb: ownerData.bankBsb || undefined,
          bankAccountNumber: ownerData.bankAccountNumber || undefined,
        });
      }

      // Update dwellings
      for (const dwelling of dwellings) {
        await updateDwelling({
          userId: user?.id as Id<"users">,
          dwellingId: dwelling._id,
          dwellingName: dwelling.dwellingName,
          dwellingType: dwelling.dwellingType,
          bedrooms: dwelling.bedrooms,
          bathrooms: dwelling.bathrooms,
          sdaDesignCategory: dwelling.sdaDesignCategory,
          sdaBuildingType: dwelling.sdaBuildingType,
          registrationDate: dwelling.registrationDate || undefined,
          maxParticipants: dwelling.maxParticipants,
        });
      }

      router.push(`/properties/${propertyId}`);
    } catch (err: any) {
      setError(err.message || "Failed to update property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!user || !property) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="properties" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/properties/${propertyId}`}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            &larr; Back to {property.propertyName || property.addressLine1}
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Property</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Details */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Property Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Property Name</label>
                <input
                  type="text"
                  value={formData.propertyName}
                  onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  placeholder="e.g., Sunrise House"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Street Address *</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Unit, suite, etc."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Suburb *</label>
                  <input
                    type="text"
                    value={formData.suburb}
                    onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">State *</label>
                  <select
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value as (typeof STATES)[number] })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Postcode *</label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    required
                    maxLength={4}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Status */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Property Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Status</label>
                <select
                  value={formData.propertyStatus}
                  onChange={(e) => setFormData({ ...formData, propertyStatus: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="active">Active (Operational SDA)</option>
                  <option value="under_construction">Under Construction</option>
                  <option value="sil_property">SIL Property (Managed for Others)</option>
                </select>
              </div>

              {formData.propertyStatus === "under_construction" && (
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Expected Completion Date</label>
                  <input
                    type="date"
                    value={formData.expectedCompletionDate}
                    onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              )}

              {formData.propertyStatus === "sil_property" && (
                <div>
                  <label className="block text-gray-300 text-sm mb-1">SIL Provider *</label>
                  <select
                    value={formData.silProviderId}
                    onChange={(e) => setFormData({ ...formData, silProviderId: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select SIL Provider...</option>
                    {silProviders?.map((provider) => (
                      <option key={provider._id} value={provider._id}>
                        {provider.companyName}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-xs mt-1">
                    The SIL provider you are managing this property for.{" "}
                    <Link href="/database/sil-providers/new" className="text-blue-400 hover:underline">
                      Add new provider
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Financial Settings</h2>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Management Fee %</label>
              <input
                type="number"
                value={formData.managementFeePercent}
                onChange={(e) => setFormData({ ...formData, managementFeePercent: e.target.value })}
                placeholder="e.g., 30"
                min="0"
                max="100"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
              />
              <p className="text-gray-400 text-xs mt-1">
                % kept as management fee for owner distributions (0-100)
              </p>
            </div>
          </div>

          {/* Owner Bank Details */}
          {property?.owner && property.owner.ownerType !== "self" && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Owner Bank Details</h2>
              <p className="text-gray-400 text-sm mb-4">
                Bank details for payment distributions to {property.owner.companyName || `${property.owner.firstName} ${property.owner.lastName}`}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Account Name</label>
                  <input
                    type="text"
                    value={ownerData.bankAccountName}
                    onChange={(e) => setOwnerData({ ...ownerData, bankAccountName: e.target.value })}
                    placeholder="e.g., John Smith or ABC Pty Ltd"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">BSB</label>
                    <input
                      type="text"
                      value={ownerData.bankBsb}
                      onChange={(e) => setOwnerData({ ...ownerData, bankBsb: e.target.value })}
                      placeholder="e.g., 062-000"
                      maxLength={7}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Account Number</label>
                    <input
                      type="text"
                      value={ownerData.bankAccountNumber}
                      onChange={(e) => setOwnerData({ ...ownerData, bankAccountNumber: e.target.value })}
                      placeholder="e.g., 12345678"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dwellings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Dwellings</h2>
            {dwellings.length === 0 ? (
              <p className="text-gray-400">No dwellings found for this property.</p>
            ) : (
              <div className="space-y-6">
                {dwellings.map((dwelling, index) => {
                  // Build full address: Dwelling Number + Street Name (without number) + Suburb + Postcode
                  const streetName = formData.addressLine1?.replace(/^\d+\s*/, "") || formData.addressLine1;
                  const fullDwellingAddress = dwelling.dwellingName
                    ? `${dwelling.dwellingName} ${streetName}, ${formData.suburb} ${formData.state} ${formData.postcode}`
                    : `${formData.addressLine1}, ${formData.suburb} ${formData.state} ${formData.postcode}`;

                  return (
                  <div key={dwelling._id} className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-4 bg-blue-900/50 px-3 py-2 rounded">{fullDwellingAddress}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Dwelling Number</label>
                        <input
                          type="text"
                          value={dwelling.dwellingName}
                          onChange={(e) => updateDwellingField(index, "dwellingName", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Dwelling Type</label>
                        <select
                          value={dwelling.dwellingType}
                          onChange={(e) => updateDwellingField(index, "dwellingType", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                        >
                          <option value="house">House</option>
                          <option value="villa">Villa</option>
                          <option value="apartment">Apartment</option>
                          <option value="unit">Unit</option>
                        </select>
                      </div>
                    </div>

                    <div className={`grid ${formData.propertyStatus === "sil_property" ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"} gap-4 mb-4`}>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Bedrooms</label>
                        <input
                          type="number"
                          value={dwelling.bedrooms}
                          onChange={(e) => updateDwellingField(index, "bedrooms", parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Bathrooms</label>
                        <input
                          type="number"
                          value={dwelling.bathrooms}
                          onChange={(e) => updateDwellingField(index, "bathrooms", parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-1">Max Participants</label>
                        <input
                          type="number"
                          value={dwelling.maxParticipants}
                          onChange={(e) => updateDwellingField(index, "maxParticipants", parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                        />
                      </div>
                      {formData.propertyStatus !== "sil_property" && (
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">Registration Date</label>
                          <input
                            type="date"
                            value={dwelling.registrationDate}
                            onChange={(e) => updateDwellingField(index, "registrationDate", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* SDA-specific fields - only show for non-SIL properties */}
                    {formData.propertyStatus !== "sil_property" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">SDA Design Category</label>
                          <select
                            value={dwelling.sdaDesignCategory}
                            onChange={(e) => updateDwellingField(index, "sdaDesignCategory", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                          >
                            <option value="improved_liveability">Improved Liveability</option>
                            <option value="fully_accessible">Fully Accessible</option>
                            <option value="robust">Robust</option>
                            <option value="high_physical_support">High Physical Support</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-1">SDA Building Type</label>
                          <select
                            value={dwelling.sdaBuildingType}
                            onChange={(e) => updateDwellingField(index, "sdaBuildingType", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white text-sm"
                          >
                            <option value="new_build">New Build</option>
                            <option value="existing">Existing</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Link
              href={`/properties/${propertyId}`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Property"}
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
