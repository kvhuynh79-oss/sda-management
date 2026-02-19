"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import CommunicationsHistory from "@/components/CommunicationsHistory";
import GlobalUploadModal from "@/components/GlobalUploadModal";
import Badge from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { confirm: confirmDialog } = useConfirmDialog();

  const propertyId = params.id as Id<"properties">;
  const userIdTyped = user ? (user.id as Id<"users">) : undefined;
  const property = useQuery(api.properties.getById, userIdTyped ? { propertyId, userId: userIdTyped } : "skip");
  const dwellings = useQuery(api.dwellings.getByProperty, userIdTyped ? { propertyId, userId: userIdTyped } : "skip");
  const documents = useQuery(api.documents.getByProperty, userIdTyped ? { userId: userIdTyped, propertyId } : "skip");
  const propertyMedia = useQuery(api.propertyMedia.getByProperty, userIdTyped ? { userId: userIdTyped, propertyId } : "skip");
  const allSilProviders = useQuery(api.silProviders.getAll, userIdTyped ? { status: "active", userId: userIdTyped } : "skip");
  const allPropertyInspections = useQuery(
    api.inspections.getByPropertyGrouped,
    userIdTyped ? { userId: userIdTyped } : "skip"
  );
  const specialistItems = useQuery(
    api.preventativeSchedule.getSpecialistByProperty,
    userIdTyped && propertyId ? { propertyId, userId: userIdTyped } : "skip"
  );
  const removeDwelling = useMutation(api.dwellings.remove);
  const removeDocument = useMutation(api.documents.remove);
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

  const propertyInspectionData = useMemo(
    () => allPropertyInspections?.find((p: any) => p.propertyId === propertyId) ?? null,
    [allPropertyInspections, propertyId]
  );

  return (
    <RequireAuth>
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
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/properties" className="text-gray-400 hover:text-white">
                Properties
              </Link>
            </li>
            <li className="text-gray-400">/</li>
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


          </div>

          {/* Right Column - Dwellings */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Dwellings</h2>
                <Link
                  href={`/properties/${propertyId}/dwellings/new`}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  + Add Dwelling
                </Link>
              </div>

              {dwellings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4"><svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg></div>
                  <p className="text-gray-400 mb-4">No dwellings added yet</p>
                  <Link
                    href={`/properties/${propertyId}/dwellings/new`}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
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

        {/* Related Documents */}
        <div className="mt-6">
          <RelatedDocuments
            documents={documents || []}
            onUploadClick={() => setUploadModalOpen(true)}
            onDelete={async (docId) => {
              const confirmed = await confirmDialog({
                title: "Delete Document?",
                message: "This will permanently delete this document. This action cannot be undone.",
                confirmLabel: "Delete",
                cancelLabel: "Cancel",
                variant: "danger",
              });
              if (confirmed) {
                await removeDocument({ id: docId, userId: userIdTyped! });
              }
            }}
            userRole={user?.role || ""}
          />
        </div>

        {/* Communications History */}
        <div className="mt-6">
          <CommunicationsHistory propertyId={propertyId} />
        </div>

        {/* Inspection History */}
        <div className="mt-6">
          <InspectionHistorySection
            propertyId={propertyId}
            propertyData={propertyInspectionData}
            specialistItems={specialistItems || []}
          />
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

      {/* Upload Modal */}
      <GlobalUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        prefillCategory="property"
        prefillEntityId={propertyId}
      />
    </div>
    </RequireAuth>
  );
}

function RelatedDocuments({
  documents,
  onUploadClick,
  onDelete,
  userRole,
}: {
  documents: any[];
  onUploadClick: () => void;
  onDelete: (docId: Id<"documents">) => Promise<void>;
  userRole: string;
}) {
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);

  const canDelete = userRole === "admin" || userRole === "property_manager";

  // Group documents by category
  const invoiceDocs = documents.filter(d => ['invoice', 'receipt', 'quote'].includes(d.documentType)) || [];
  const certDocs = documents.filter(d => [
    'fire_safety_certificate', 'building_compliance_certificate',
    'ndis_practice_standards_cert', 'sda_design_certificate',
    'sda_registration_cert', 'ndis_worker_screening'
  ].includes(d.documentType)) || [];
  const leaseDocs = documents.filter(d => d.documentType === 'lease') || [];
  const otherDocs = documents.filter(d =>
    !invoiceDocs.includes(d) && !certDocs.includes(d) && !leaseDocs.includes(d)
  ) || [];

  const invoiceTotal = invoiceDocs.reduce((sum, doc) => sum + (doc.invoiceAmount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDocTypeLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDelete = async (docId: Id<"documents">) => {
    setDeletingId(docId);
    try {
      await onDelete(docId);
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const DocumentCard = ({ doc }: { doc: any }) => {
    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
    const isExpiringSoon =
      doc.expiryDate &&
      !isExpired &&
      new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const truncateFilename = (name: string) => {
      if (name.length <= 40) return name;
      const ext = name.split('.').pop();
      return `${name.substring(0, 37)}...${ext}`;
    };

    return (
      <div className="bg-gray-700 rounded-lg p-4 border border-gray-700 hover:bg-gray-700/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="neutral" size="xs">
                {getDocTypeLabel(doc.documentType)}
              </Badge>
              {doc.invoiceAmount && (
                <span className="text-green-400 text-sm font-medium">
                  {formatCurrency(doc.invoiceAmount)}
                </span>
              )}
            </div>
            <p className="text-white text-sm font-medium truncate" title={doc.fileName}>
              {truncateFilename(doc.fileName)}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Uploaded {formatDate(doc._creationTime)}
              {doc.expiryDate && (
                <span className={isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : ""}>
                  {" "}| Expires: {doc.expiryDate}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {doc.downloadUrl && (
              <a
                href={doc.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs rounded-lg transition-colors"
              >
                Download
              </a>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(doc._id)}
                disabled={deletingId === doc._id}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                title="Delete document"
              >
                {deletingId === doc._id ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DocumentGroup = ({ title, docs, showTotal }: { title: string; docs: any[]; showTotal?: boolean }) => {
    if (docs.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {showTotal && (
            <span className="text-green-400 font-semibold">
              Total: {formatCurrency(invoiceTotal)}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Related Documents</h2>
        <button
          onClick={onUploadClick}
          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm"
        >
          + Upload
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-gray-400 mb-4">No documents uploaded yet. Click Upload to add one.</p>
        </div>
      ) : (
        <>
          <DocumentGroup title="Invoices" docs={invoiceDocs} showTotal={invoiceDocs.length > 0} />
          <DocumentGroup title="Certificates" docs={certDocs} />
          <DocumentGroup title="Leases" docs={leaseDocs} />
          <DocumentGroup title="Other" docs={otherDocs} />
        </>
      )}
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
    blue: "text-teal-500",
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
  const { alert: alertDialog } = useConfirmDialog();
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
    dwelling?._id && userId ? { dwellingId: dwelling._id as Id<"dwellings">, userId } : "skip"
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
      await alertDialog("Failed to allocate SIL provider");
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
      await alertDialog("Failed to remove allocation");
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
          <h3 className="text-lg font-semibold text-white bg-teal-950/50 px-2 py-1 rounded">{fullAddress}</h3>
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
            className="text-xs text-teal-500 hover:text-teal-400"
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
                    className="text-teal-500 text-sm hover:text-teal-400 mt-2 inline-block"
                  >
                    Add a SIL provider first &rarr;
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Select SIL Provider *
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value as Id<"silProviders">)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600"
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Access Level *
                    </label>
                    <div className="space-y-2">
                      {ACCESS_LEVELS.map((level) => (
                        <label
                          key={level.value}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            accessLevel === level.value
                              ? "border-teal-600 bg-teal-700/10"
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
                            <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={providerNotes}
                      onChange={(e) => setProviderNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-600"
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
                      className="flex-1 py-2 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
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


function MediaGallery({
  propertyId,
  media,
  userId,
}: {
  propertyId: Id<"properties">;
  media: any[];
  userId: Id<"users">;
}) {
  const { alert: alertDialog } = useConfirmDialog();
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
          await alertDialog(`Skipping ${file.name}: Only images and videos are supported`);
          continue;
        }

        // Get upload URL
        const uploadUrl = await generateUploadUrl({ userId });

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
        await alertDialog(`Failed to upload ${file.name}`);
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
      await deleteMedia({ userId, mediaId: mediaId as Id<"propertyMedia"> });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting media:", error);
      await alertDialog("Failed to delete media");
    }
  };

  const handleSetFeatured = async (mediaId: string, isFeatured: boolean) => {
    try {
      await setFeatured({ userId, mediaId: mediaId as Id<"propertyMedia">, isFeatured });
    } catch (error) {
      console.error("Error setting featured:", error);
      await alertDialog("Failed to update featured status");
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
        isDragOver ? "ring-2 ring-teal-600 ring-offset-2 ring-offset-gray-900" : ""
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
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isUploading ? uploadProgress || "Uploading..." : "+ Add Photos/Videos"}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-teal-700/20 rounded-lg flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-gray-800 px-6 py-4 rounded-lg shadow-lg border-2 border-teal-600">
            <p className="text-white font-medium">Drop files to upload</p>
          </div>
        </div>
      )}

      {media.length === 0 ? (
        <div
          className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors ${
            isDragOver ? "border-teal-600 bg-teal-700/10" : "border-gray-700"
          }`}
        >
          <div className="flex justify-center mb-4">{isDragOver ? <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" /></svg> : <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>}</div>
          <p className="text-gray-400 mb-2">
            {isDragOver ? "Drop files here" : "No photos or videos yet"}
          </p>
          <p className="text-gray-400 text-sm mb-4">
            {isDragOver ? "Release to upload" : "Drag & drop or click to upload images and videos"}
          </p>
          {!isDragOver && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
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

function InspectionHistorySection({
  propertyId,
  propertyData,
  specialistItems,
}: {
  propertyId: Id<"properties">;
  propertyData: any | null;
  specialistItems: any[];
}) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalOpenIssues = propertyData
    ? propertyData.dwellings?.reduce(
        (sum: number, d: any) => sum + (d.totalFailed || 0),
        0
      ) + (propertyData.unlinkedInspections?.reduce(
        (sum: number, i: any) => sum + (i.failedItems || 0),
        0
      ) || 0)
    : 0;

  const getSpecialistStatus = (item: any) => {
    if (!item.nextDueDate) return { label: "No date", color: "text-gray-400" };
    const dueDate = new Date(item.nextDueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue < 0) return { label: "Overdue", color: "text-red-400" };
    if (daysUntilDue <= 14) return { label: "Due Soon", color: "text-yellow-400" };
    return { label: "Current", color: "text-green-400" };
  };

  const getSpecialistIcon = (category: string | undefined) => {
    switch (category) {
      case "fire_safety":
        return (
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
          </svg>
        );
      case "smoke_alarms":
        return (
          <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        );
      case "sprinklers":
        return (
          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.07A2.625 2.625 0 017.17 8.26l5.25 3 5.25-3a2.625 2.625 0 011.134 3.84l-5.384 3.07z" />
          </svg>
        );
    }
  };

  const getInspectionStatusDisplay = (inspection: any) => {
    if (inspection.status === "completed") {
      if (inspection.failedItems === 0) {
        return {
          label: `Passed (${inspection.passedItems}/${inspection.totalItems} items)`,
          icon: (
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "text-green-400",
        };
      }
      return {
        label: `${inspection.failedItems} issue${inspection.failedItems !== 1 ? "s" : ""} found`,
        icon: (
          <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ),
        color: "text-yellow-400",
      };
    }
    if (inspection.status === "in_progress") {
      return {
        label: `In progress (${inspection.completedItems}/${inspection.totalItems})`,
        icon: (
          <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        ),
        color: "text-teal-400",
      };
    }
    if (inspection.status === "scheduled") {
      const isOverdue = new Date(inspection.scheduledDate) < new Date();
      return {
        label: isOverdue ? "Overdue" : "Scheduled",
        icon: (
          <svg className={`w-4 h-4 shrink-0 ${isOverdue ? "text-red-400" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        ),
        color: isOverdue ? "text-red-400" : "text-gray-400",
      };
    }
    return { label: "Cancelled", icon: null, color: "text-gray-400" };
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Inspection History</h2>
        <Link
          href={`/inspections/new?propertyId=${propertyId}`}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm transition-colors"
        >
          Schedule Inspection
        </Link>
      </div>

      {/* Summary Stats Row */}
      {propertyData && (
        <div className="flex flex-wrap gap-3 mb-5">
          <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
            Last: {formatDate(propertyData.lastInspectionDate)}
          </span>
          <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
            Next Due: {formatDate(propertyData.nextScheduledDate)}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full ${
            totalOpenIssues > 0
              ? "bg-yellow-600/20 text-yellow-400"
              : "bg-gray-700 text-gray-300"
          }`}>
            Open Issues: {totalOpenIssues}
          </span>
          <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
            Specialist Items: {specialistItems.length}
          </span>
        </div>
      )}

      {/* No inspections state */}
      {(!propertyData || propertyData.totalInspections === 0) ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-gray-400 mb-4">No inspections recorded for this property yet.</p>
          <Link
            href={`/inspections/new?propertyId=${propertyId}`}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm transition-colors inline-block"
          >
            Schedule First Inspection
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Per-dwelling breakdown */}
          {propertyData.dwellings?.map((dwellingData: any) => (
            <div key={dwellingData.dwellingId} className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                {dwellingData.dwellingName || "Unnamed Dwelling"}
              </h3>

              {dwellingData.inspections.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No inspections for this dwelling.</p>
              ) : (
                <div className="space-y-2">
                  {dwellingData.inspections.slice(0, 5).map((inspection: any, idx: number) => {
                    const statusDisplay = getInspectionStatusDisplay(inspection);
                    const dateStr = inspection.completedDate || inspection.scheduledDate;
                    const isLatest = idx === 0;

                    return (
                      <Link
                        key={inspection._id}
                        href={`/inspections/${inspection._id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {statusDisplay.icon}
                          <div className="min-w-0">
                            <p className={`text-sm ${isLatest ? "font-medium text-white" : "text-gray-300"}`}>
                              {isLatest ? "Latest: " : ""}{formatDate(dateStr)}
                            </p>
                            <p className={`text-xs ${statusDisplay.color}`}>
                              {statusDisplay.label}
                            </p>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    );
                  })}

                  {/* Next Scheduled */}
                  {dwellingData.nextScheduled && (
                    <div className="flex items-center gap-2.5 px-2.5 pt-2 border-t border-gray-700/50">
                      <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <p className="text-xs text-teal-400">
                        Next Scheduled: {formatDate(dwellingData.nextScheduled.scheduledDate)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Unlinked inspections (not tied to a specific dwelling) */}
          {propertyData.unlinkedInspections && propertyData.unlinkedInspections.length > 0 && (
            <div className="border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                Property-Level Inspections
              </h3>
              <div className="space-y-2">
                {propertyData.unlinkedInspections.slice(0, 5).map((inspection: any) => {
                  const statusDisplay = getInspectionStatusDisplay(inspection);
                  const dateStr = inspection.completedDate || inspection.scheduledDate;

                  return (
                    <Link
                      key={inspection._id}
                      href={`/inspections/${inspection._id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {statusDisplay.icon}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-300">{formatDate(dateStr)}</p>
                          <p className={`text-xs ${statusDisplay.color}`}>{statusDisplay.label}</p>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Specialist Maintenance Schedule */}
      {specialistItems.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.07A2.625 2.625 0 017.17 8.26l5.25 3 5.25-3a2.625 2.625 0 011.134 3.84l-5.384 3.07z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
            Specialist Maintenance
          </h3>
          <div className="space-y-2">
            {specialistItems.map((item: any) => {
              const status = getSpecialistStatus(item);
              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getSpecialistIcon(item.specialistCategory)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.taskName}</p>
                      {item.dwelling && (
                        <p className="text-xs text-gray-400">{item.dwelling.dwellingName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-xs font-medium ${status.color}`}>
                      {status.label === "Overdue"
                        ? `OVERDUE: was due ${formatDate(item.nextDueDate)}`
                        : `Due: ${formatDate(item.nextDueDate)}`}
                    </p>
                    <p className={`text-xs ${status.color}`}>{status.label}</p>
                  </div>
                </div>
              );
            })}
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
