"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

// Access level options for SIL provider allocation
const ACCESS_LEVELS = [
  { value: "full", label: "Full Access", description: "Incidents + Maintenance", color: "green" },
  { value: "incidents_only", label: "Incidents Only", description: "Can only report incidents", color: "red" },
  { value: "maintenance_only", label: "Maintenance Only", description: "Can only report maintenance", color: "yellow" },
  { value: "view_only", label: "View Only", description: "Read-only access", color: "gray" },
] as const;

// Helper component for property status badge
function PropertyStatusBadge({ status }: { status?: string }) {
  if (!status || status === "active") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
        Active
      </span>
    );
  }
  if (status === "under_construction") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-600 text-white">
        Under Construction
      </span>
    );
  }
  if (status === "sil_property") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
        SIL Property
      </span>
    );
  }
  return null;
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  const propertyId = params.id as Id<"properties">;
  const property = useQuery(api.properties.getById, { propertyId });
  const dwellings = useQuery(api.dwellings.getByProperty, { propertyId });
  const documents = useQuery(api.documents.getByProperty, { propertyId });
  const propertyMedia = useQuery(api.propertyMedia.getByProperty, { propertyId });
  const allSilProviders = useQuery(api.silProviders.getAll, { status: "active" });
  const removeDwelling = useMutation(api.dwellings.remove);
  const linkDwellingProvider = useMutation(api.silProviders.linkDwelling);
  const unlinkDwellingProvider = useMutation(api.silProviders.unlinkDwelling);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  if (property === undefined || dwellings === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading property details...</div>
        </main>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="properties" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-400 text-center py-12">Property not found</div>
        </main>
      </div>
    );
  }

  const getOwnerName = () => {
    if (!property.owner) return "Unknown";
    if (property.owner.ownerType === "self") return "Self-owned";
    if (property.owner.companyName) return property.owner.companyName;
    return `${property.owner.firstName} ${property.owner.lastName}`;
  };

  const totalCapacity = dwellings.reduce((sum, d) => sum + d.maxParticipants, 0);
  const currentOccupancy = dwellings.reduce((sum, d) => sum + d.currentOccupancy, 0);
  const vacancies = totalCapacity - currentOccupancy;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="properties" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/properties" className="text-gray-400 hover:text-white">
                Properties
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">{property.propertyName || property.addressLine1}</li>
          </ol>
        </nav>

        {/* Property Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {property.propertyName || property.addressLine1}
                </h1>
                <PropertyStatusBadge status={(property as any).propertyStatus} />
              </div>
              <p className="text-gray-400 text-lg">
                {property.addressLine1}
                {property.addressLine2 && `, ${property.addressLine2}`}
              </p>
              <p className="text-gray-400">
                {property.suburb}, {property.state} {property.postcode}
              </p>
              {/* Show additional status info */}
              {(property as any).propertyStatus === "under_construction" && (property as any).expectedCompletionDate && (
                <p className="text-yellow-400 text-sm mt-2">
                  Expected completion: {(property as any).expectedCompletionDate}
                </p>
              )}
              {(property as any).propertyStatus === "sil_property" && (property as any).silProviderName && (
                <p className="text-purple-400 text-sm mt-2">
                  SIL Provider: {(property as any).silProviderName}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/properties/${propertyId}/edit`}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Edit Property
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <StatCard label="Dwellings" value={dwellings.length.toString()} />
            <StatCard label="Total Capacity" value={totalCapacity.toString()} />
            <StatCard
              label="Current Occupancy"
              value={currentOccupancy.toString()}
              color="green"
            />
            <StatCard
              label="Vacancies"
              value={vacancies.toString()}
              color={vacancies > 0 ? "yellow" : "green"}
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Owner Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Owner Information</h2>
              <div className="space-y-3">
                <DetailRow label="Owner" value={getOwnerName()} />
                <DetailRow label="Ownership Type" value={property.ownershipType?.replace("_", " ") || "N/A"} />
                <DetailRow
                  label="Management Fee %"
                  value={`${property.managementFeePercent || 0}%`}
                />
                {property.owner && property.owner.email && (
                  <DetailRow label="Email" value={property.owner.email} />
                )}
                {property.owner && property.owner.phone && (
                  <DetailRow label="Phone" value={property.owner.phone} />
                )}
                {property.owner && property.owner.abn && (
                  <DetailRow label="ABN" value={property.owner.abn} />
                )}
              </div>

              {/* Bank Details */}
              {property.owner && (property.owner.bankAccountName || property.owner.bankBsb || property.owner.bankAccountNumber) && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Bank Details</h3>
                  <div className="space-y-2">
                    {property.owner.bankAccountName && (
                      <DetailRow label="Account Name" value={property.owner.bankAccountName} />
                    )}
                    {property.owner.bankBsb && (
                      <DetailRow label="BSB" value={property.owner.bankBsb} />
                    )}
                    {property.owner.bankAccountNumber && (
                      <DetailRow label="Account Number" value={property.owner.bankAccountNumber} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {property.notes && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}

            {/* Documents */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Documents</h2>
                <Link
                  href={`/documents?propertyId=${propertyId}`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add Document
                </Link>
              </div>
              {documents === undefined ? (
                <p className="text-gray-400 text-sm">Loading...</p>
              ) : documents.length === 0 ? (
                <p className="text-gray-400 text-sm">No documents attached to this property</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <DocumentRow key={doc._id} document={doc} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Dwellings */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Dwellings</h2>
                <Link
                  href={`/properties/${propertyId}/dwellings/new`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  + Add Dwelling
                </Link>
              </div>

              {dwellings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-4">🏘️</div>
                  <p className="text-gray-400 mb-4">No dwellings added yet</p>
                  <Link
                    href={`/properties/${propertyId}/dwellings/new`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    + Add First Dwelling
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dwellings.map((dwelling) => (
                    <DwellingCard
                      key={dwelling._id}
                      dwelling={dwelling}
                      property={property}
                      allSilProviders={allSilProviders || []}
                      userId={user?.id as Id<"users">}
                      onDelete={(id) => removeDwelling({ dwellingId: id as Id<"dwellings">, userId: user?.id as Id<"users"> })}
                      onLinkProvider={async (dwellingId, providerId, accessLevel, notes) => {
                        await linkDwellingProvider({
                          dwellingId,
                          silProviderId: providerId,
                          accessLevel,
                          notes,
                          userId: user?.id as Id<"users">,
                        });
                      }}
                      onUnlinkProvider={async (linkId) => {
                        await unlinkDwellingProvider({ linkId });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Property Media Gallery */}
        <div className="mt-6">
          <MediaGallery
            propertyId={propertyId}
            media={propertyMedia || []}
            userId={user?.id as Id<"users">}
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "blue"
}: {
  label: string;
  value: string;
  color?: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function DwellingCard({
  dwelling,
  property,
  allSilProviders,
  userId,
  onDelete,
  onLinkProvider,
  onUnlinkProvider,
}: {
  dwelling: any;
  property: any;
  allSilProviders: Array<{ _id: Id<"silProviders">; companyName: string; email: string }>;
  userId: Id<"users">;
  onDelete: (id: string) => void;
  onLinkProvider: (
    dwellingId: Id<"dwellings">,
    providerId: Id<"silProviders">,
    accessLevel: "full" | "incidents_only" | "maintenance_only" | "view_only",
    notes?: string
  ) => Promise<void>;
  onUnlinkProvider: (linkId: Id<"silProviderDwellings">) => Promise<void>;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Id<"silProviders"> | "">("");
  const [accessLevel, setAccessLevel] = useState<"full" | "incidents_only" | "maintenance_only" | "view_only">("full");
  const [providerNotes, setProviderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<Id<"silProviderDwellings"> | null>(null);

  // Query allocated providers for this dwelling
  const allocatedProviders = useQuery(
    api.silProviders.getProvidersForDwelling,
    dwelling?._id ? { dwellingId: dwelling._id as Id<"dwellings"> } : "skip"
  );

  const getOccupancyColor = () => {
    if (dwelling.occupancyStatus === "fully_occupied") return "bg-green-600";
    if (dwelling.occupancyStatus === "vacant") return "bg-red-600";
    return "bg-yellow-600";
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Build full address: Dwelling Number + Street Name (without number) + Suburb + State + Postcode
  const streetName = property?.addressLine1?.replace(/^\d+\s*/, "") || property?.addressLine1;
  const fullAddress = dwelling.dwellingName
    ? `${dwelling.dwellingName} ${streetName}, ${property?.suburb || ""} ${property?.state || ""} ${property?.postcode || ""}`
    : `${property?.addressLine1 || ""}, ${property?.suburb || ""} ${property?.state || ""} ${property?.postcode || ""}`;

  // Filter out already allocated providers
  const allocatedIds = (allocatedProviders || []).map((p) => p.silProviderId);
  const availableProviders = (allSilProviders || []).filter((p) => !allocatedIds.includes(p._id));

  const handleAddProvider = async () => {
    if (!selectedProvider) return;
    setIsSubmitting(true);
    try {
      await onLinkProvider(dwelling._id as Id<"dwellings">, selectedProvider, accessLevel, providerNotes || undefined);
      setShowAddProvider(false);
      setSelectedProvider("");
      setAccessLevel("full");
      setProviderNotes("");
    } catch (error) {
      console.error("Error allocating SIL provider:", error);
      alert("Failed to allocate SIL provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveProvider = async (linkId: Id<"silProviderDwellings">) => {
    try {
      await onUnlinkProvider(linkId);
      setShowRemoveConfirm(null);
    } catch (error) {
      console.error("Error removing allocation:", error);
      alert("Failed to remove allocation");
    }
  };

  const getAccessBadge = (level: string) => {
    const config = ACCESS_LEVELS.find((a) => a.value === level) || ACCESS_LEVELS[0];
    const colorMap: Record<string, string> = {
      green: "bg-green-600/20 text-green-400",
      red: "bg-red-600/20 text-red-400",
      yellow: "bg-yellow-600/20 text-yellow-400",
      gray: "bg-gray-600/20 text-gray-400",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colorMap[config.color]}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white bg-blue-900/50 px-2 py-1 rounded">{fullAddress}</h3>
          <p className="text-gray-400 text-sm capitalize mt-1">{dwelling.dwellingType}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs text-white ${getOccupancyColor()}`}>
            {dwelling.currentOccupancy}/{dwelling.maxParticipants} occupied
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
            title="Delete dwelling"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-xs">Bedrooms</p>
          <p className="text-white text-sm">{dwelling.bedrooms}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Design Category</p>
          <p className="text-white text-sm">{formatCategory(dwelling.sdaDesignCategory)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Building Type</p>
          <p className="text-white text-sm capitalize">{dwelling.sdaBuildingType.replace("_", " ")}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Registration Date</p>
          <p className="text-white text-sm">{dwelling.registrationDate || "Not registered"}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">SDA Amount (Annual)</p>
          <p className="text-white text-sm font-medium">
            {dwelling.sdaRegisteredAmount
              ? `$${dwelling.sdaRegisteredAmount.toLocaleString()}`
              : "Not set"}
          </p>
        </div>
      </div>

      {/* SIL Provider Allocation Section */}
      <div className="pt-3 border-t border-gray-600 mb-3">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-400 text-xs">SIL Provider:</p>
          <button
            onClick={() => setShowAddProvider(true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            + Allocate
          </button>
        </div>
        {!allocatedProviders || allocatedProviders.length === 0 ? (
          <p className="text-gray-400 text-xs italic">No SIL provider allocated</p>
        ) : (
          <div className="space-y-1">
            {allocatedProviders.map((allocation) => (
              <div
                key={allocation._id}
                className="flex items-center justify-between p-2 bg-gray-800 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">{allocation.provider?.companyName}</span>
                  {getAccessBadge(allocation.accessLevel)}
                </div>
                <button
                  onClick={() => setShowRemoveConfirm(allocation._id)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dwelling.participants && dwelling.participants.length > 0 && (
        <div className="pt-3 border-t border-gray-600">
          <p className="text-gray-400 text-xs mb-2">Current Residents:</p>
          <div className="space-y-1">
            {dwelling.participants.map((participant: any) => (
              <Link
                key={participant._id}
                href={`/participants/${participant._id}`}
                className="flex justify-between items-center p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <span className="text-white text-sm">
                  {participant.firstName} {participant.lastName}
                </span>
                <span className="text-gray-400 text-xs">{participant.ndisNumber}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Dwelling?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete &quot;{dwelling.dwellingName}&quot;?
              {dwelling.participants && dwelling.participants.length > 0 && (
                <span className="block mt-2 text-yellow-400">
                  Warning: This dwelling has {dwelling.participants.length} resident(s) assigned.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(dwelling._id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add SIL Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAddProvider(false)}>
          <div className="bg-gray-800 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Allocate SIL Provider</h3>
              <button
                onClick={() => setShowAddProvider(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {availableProviders.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400">No available SIL providers to allocate.</p>
                  <Link
                    href="/database/sil-providers"
                    className="text-blue-400 text-sm hover:text-blue-300 mt-2 inline-block"
                  >
                    Add a SIL provider first &rarr;
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select SIL Provider *
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as Id<"silProviders">)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a provider...</option>
                      {availableProviders.map((provider) => (
                        <option key={provider._id} value={provider._id}>
                          {provider.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Access Level *
                    </label>
                    <div className="space-y-2">
                      {ACCESS_LEVELS.map((level) => (
                        <label
                          key={level.value}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            accessLevel === level.value
                              ? "border-blue-500 bg-blue-600/10"
                              : "border-gray-600 hover:border-gray-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name="accessLevel"
                            value={level.value}
                            checked={accessLevel === level.value}
                            onChange={(e) => setAccessLevel(e.target.value as typeof accessLevel)}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{level.label}</p>
                            <p className="text-gray-400 text-xs">{level.description}</p>
                          </div>
                          {accessLevel === level.value && (
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={providerNotes}
                      onChange={(e) => setProviderNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                      placeholder="Any notes about this allocation..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowAddProvider(false)}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddProvider}
                      disabled={!selectedProvider || isSubmitting}
                      className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {isSubmitting ? "Allocating..." : "Allocate"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Provider Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRemoveConfirm(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Remove Allocation?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This will remove the SIL provider&apos;s access to this dwelling.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveProvider(showRemoveConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ document }: { document: any }) {
  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ndis_plan: "NDIS Plan",
      service_agreement: "Service Agreement",
      lease: "Lease",
      insurance: "Insurance",
      compliance: "Compliance",
      centrepay_consent: "Centrepay Consent",
      report: "Report",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getDocTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lease: "bg-purple-600",
      insurance: "bg-yellow-600",
      compliance: "bg-green-600",
      report: "bg-blue-600",
      other: "bg-gray-600",
    };
    return colors[type] || "bg-gray-600";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isExpired = document.expiryDate && new Date(document.expiryDate) < new Date();
  const isExpiringSoon =
    document.expiryDate &&
    !isExpired &&
    new Date(document.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`px-2 py-1 rounded text-xs text-white ${getDocTypeColor(document.documentType)}`}>
          {getDocTypeLabel(document.documentType)}
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm truncate">{document.fileName}</p>
          <p className="text-gray-400 text-xs">
            Uploaded {formatDate(document.createdAt)}
            {document.expiryDate && (
              <span className={isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : ""}>
                {" "}| Expires: {document.expiryDate}
              </span>
            )}
          </p>
        </div>
      </div>
      {document.downloadUrl && (
        <a
          href={document.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          View
        </a>
      )}
    </div>
  );
}

function MediaGallery({
  propertyId,
  media,
  userId,
}: {
  propertyId: Id<"properties">;
  media: any[];
  userId: Id<"users">;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const generateUploadUrl = useMutation(api.propertyMedia.generateUploadUrl);
  const saveMedia = useMutation(api.propertyMedia.saveMedia);
  const deleteMedia = useMutation(api.propertyMedia.deleteMedia);
  const setFeatured = useMutation(api.propertyMedia.setFeatured);

  // Shared file upload handler
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}: ${file.name}`);

      try {
        // Determine media type
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (!isVideo && !isImage) {
          alert(`Skipping ${file.name}: Only images and videos are supported`);
          continue;
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const { storageId } = await result.json();

        // Save media record
        await saveMedia({
          propertyId,
          storageId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          mediaType: isVideo ? "video" : "photo",
          uploadedBy: userId,
        });
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await uploadFiles(files);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia({ mediaId: mediaId as Id<"propertyMedia"> });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media");
    }
  };

  const handleSetFeatured = async (mediaId: string, isFeatured: boolean) => {
    try {
      await setFeatured({ mediaId: mediaId as Id<"propertyMedia">, isFeatured });
    } catch (error) {
      console.error("Error setting featured:", error);
      alert("Failed to update featured status");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const photos = media.filter((m) => m.mediaType === "photo");
  const videos = media.filter((m) => m.mediaType === "video");

  return (
    <div
      ref={dropZoneRef}
      className={`relative bg-gray-800 rounded-lg p-6 transition-all ${
        isDragOver ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900" : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Property Media</h2>
          <p className="text-gray-400 text-sm">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}, {videos.length} video{videos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isUploading ? uploadProgress || "Uploading..." : "+ Add Photos/Videos"}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/20 rounded-lg flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-gray-800 px-6 py-4 rounded-lg shadow-lg border-2 border-blue-500">
            <p className="text-white font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {media.length === 0 ? (
        <div
          className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors ${
            isDragOver ? "border-blue-500 bg-blue-600/10" : "border-gray-700"
          }`}
        >
          <div className="text-gray-400 text-5xl mb-4">{isDragOver ? "📥" : "📷"}</div>
          <p className="text-gray-400 mb-2">
            {isDragOver ? "Drop files here" : "No photos or videos yet"}
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {isDragOver ? "Release to upload" : "Drag & drop or click to upload images and videos"}
          </p>
          {!isDragOver && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Upload Media
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item._id}
              className="relative group aspect-square bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setSelectedMedia(item)}
            >
              {item.mediaType === "photo" ? (
                <img
                  src={item.url}
                  alt={item.title || item.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Featured badge */}
              {item.isFeatured && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                  Featured
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetFeatured(item._id, !item.isFeatured);
                  }}
                  className={`p-2 rounded-full ${
                    item.isFeatured ? "bg-yellow-500 text-black" : "bg-gray-700 text-white"
                  } hover:scale-110 transition-transform`}
                  title={item.isFeatured ? "Remove featured" : "Set as featured"}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(item._id);
                  }}
                  className="p-2 bg-red-600 rounded-full text-white hover:scale-110 transition-transform"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media viewer modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.mediaType === "photo" ? (
              <img
                src={selectedMedia.url}
                alt={selectedMedia.title || selectedMedia.fileName}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full h-auto max-h-[80vh] rounded-lg"
              />
            )}

            <div className="mt-4 text-center">
              <p className="text-white font-medium">{selectedMedia.title || selectedMedia.fileName}</p>
              {selectedMedia.description && (
                <p className="text-gray-400 text-sm mt-1">{selectedMedia.description}</p>
              )}
              <p className="text-gray-400 text-xs mt-2">
                {formatFileSize(selectedMedia.fileSize)} | {selectedMedia.fileType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Media?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This action cannot be undone. The media will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
