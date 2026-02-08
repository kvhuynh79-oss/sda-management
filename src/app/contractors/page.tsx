"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { Id } from "../../../convex/_generated/dataModel";
import { formatStatus } from "@/utils/format";

type Specialty =
  | "plumbing"
  | "electrical"
  | "appliances"
  | "building"
  | "grounds"
  | "safety"
  | "general"
  | "multi_trade";

const SPECIALTIES: { value: Specialty; label: string }[] = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "building", label: "Building/Construction" },
  { value: "grounds", label: "Grounds/Landscaping" },
  { value: "safety", label: "Safety Equipment" },
  { value: "general", label: "General Maintenance" },
  { value: "multi_trade", label: "Multi-Trade" },
];

const SPECIALTY_BADGE_COLORS: Record<string, string> = {
  plumbing: "bg-blue-600",
  electrical: "bg-yellow-600",
  appliances: "bg-purple-600",
  building: "bg-orange-600",
  grounds: "bg-green-600",
  safety: "bg-red-600",
  general: "bg-gray-600",
  multi_trade: "bg-indigo-600",
};

export default function ContractorsPage() {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");

  const contractors = useQuery(api.contractors.getAll);
  const properties = useQuery(api.properties.getAll);
  const createContractor = useMutation(api.contractors.create);
  const updateContractor = useMutation(api.contractors.update);
  const removeContractor = useMutation(api.contractors.remove);

  // Memoize filtered contractors
  const filteredContractors = useMemo(() => {
    if (!contractors) return [];

    return contractors.filter((contractor) => {
      const matchesSearch =
        !searchTerm ||
        contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecialty =
        filterSpecialty === "all" || contractor.specialty === filterSpecialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [contractors, searchTerm, filterSpecialty]);

  // Memoize stats
  const stats = useMemo(() => {
    if (!contractors) return null;
    return {
      total: contractors.length,
      plumbers: contractors.filter((c) => c.specialty === "plumbing").length,
      electricians: contractors.filter((c) => c.specialty === "electrical").length,
      multiTrade: contractors.filter((c) => c.specialty === "multi_trade").length,
    };
  }, [contractors]);

  const hasFilters = searchTerm !== "" || filterSpecialty !== "all";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="operations" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Contractors</h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Manage trade contractors for maintenance work
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0 self-start sm:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              + Add Contractor
            </button>
          </div>

          {/* Search and Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter contractors</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="search" className="sr-only">
                  Search contractors
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="specialty-filter" className="sr-only">
                  Filter by specialty
                </label>
                <select
                  id="specialty-filter"
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Specialties</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard title="Total Contractors" value={stats.total} color="blue" />
              <StatCard title="Plumbers" value={stats.plumbers} color="blue" />
              <StatCard title="Electricians" value={stats.electricians} color="yellow" />
              <StatCard title="Multi-Trade" value={stats.multiTrade} color="purple" />
            </div>
          )}

          {/* Results count */}
          {contractors !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {filteredContractors.length} of {contractors.length} contractors
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Contractors List */}
          {contractors === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading contractors..." />
          ) : filteredContractors.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No contractors found" : "No contractors yet"}
              description={
                hasFilters
                  ? "Try adjusting your search or filters"
                  : "Add your first contractor to get started"
              }
              icon={<svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
              isFiltered={hasFilters}
            />
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
              aria-label="Contractors list"
            >
              {filteredContractors.map((contractor) => (
                <ContractorCard
                  key={contractor._id}
                  contractor={contractor}
                  onEdit={() => setEditingContractor(contractor)}
                  onRemove={() => {
                    if (confirm("Are you sure you want to remove this contractor?")) {
                      removeContractor({
                        contractorId: contractor._id,
                        userId: user?.id as Id<"users">,
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </main>

        {/* Add/Edit Modal */}
        {(showAddModal || editingContractor) && (
          <ContractorModal
            contractor={editingContractor}
            properties={properties || []}
            onClose={() => {
              setShowAddModal(false);
              setEditingContractor(null);
            }}
            onSave={async (data) => {
              if (editingContractor) {
                await updateContractor({
                  contractorId: editingContractor._id,
                  ...data,
                });
              } else {
                await createContractor(data);
              }
              setShowAddModal(false);
              setEditingContractor(null);
            }}
          />
        )}
      </div>
    </RequireAuth>
  );
}

function ContractorCard({
  contractor,
  onEdit,
  onRemove,
}: {
  contractor: any;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-700/80 transition-colors" role="listitem">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-white font-semibold">{contractor.companyName}</h2>
          {contractor.contactName && (
            <p className="text-gray-400 text-sm">{contractor.contactName}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full text-white ${
            SPECIALTY_BADGE_COLORS[contractor.specialty] || "bg-gray-600"
          }`}
        >
          {formatStatus(contractor.specialty)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>{contractor.email}</span>
        </div>
        {contractor.phone && (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{contractor.phone}</span>
          </div>
        )}
        {contractor.licenseNumber && (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Lic: {contractor.licenseNumber}</span>
          </div>
        )}
      </div>

      {contractor.properties && contractor.properties.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Preferred Properties:</p>
          <div className="flex flex-wrap gap-1">
            {contractor.properties.slice(0, 3).map((prop: any) => (
              <span key={prop._id} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                {prop.propertyName || prop.suburb}
              </span>
            ))}
            {contractor.properties.length > 3 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{contractor.properties.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
        <Link
          href={`/contractors/${contractor._id}`}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View
        </Link>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={onRemove}
          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function ContractorModal({
  contractor,
  properties,
  onClose,
  onSave,
}: {
  contractor: any;
  properties: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    companyName: contractor?.companyName || "",
    contactName: contractor?.contactName || "",
    email: contractor?.email || "",
    phone: contractor?.phone || "",
    abn: contractor?.abn || "",
    specialty: contractor?.specialty || "general",
    secondarySpecialties: contractor?.secondarySpecialties || [],
    licenseNumber: contractor?.licenseNumber || "",
    insuranceExpiry: contractor?.insuranceExpiry || "",
    address: contractor?.address || "",
    suburb: contractor?.suburb || "",
    state: contractor?.state || "",
    postcode: contractor?.postcode || "",
    preferredProperties: contractor?.preferredProperties || [],
    notes: contractor?.notes || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        preferredProperties:
          formData.preferredProperties.length > 0 ? formData.preferredProperties : undefined,
        secondarySpecialties:
          formData.secondarySpecialties.length > 0 ? formData.secondarySpecialties : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProperty = (propId: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredProperties: prev.preferredProperties.includes(propId)
        ? prev.preferredProperties.filter((id: string) => id !== propId)
        : [...prev.preferredProperties, propId],
    }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <h3 id="modal-title" className="text-lg font-semibold text-white mb-4">
          {contractor ? "Edit Contractor" : "Add Contractor"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyName" className="block text-sm text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="contactName" className="block text-sm text-gray-300 mb-1">
                Contact Name
              </label>
              <input
                id="contactName"
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm text-gray-300 mb-1">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Trade Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="specialty" className="block text-sm text-gray-300 mb-1">
                Primary Specialty *
              </label>
              <select
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="abn" className="block text-sm text-gray-300 mb-1">
                ABN
              </label>
              <input
                id="abn"
                type="text"
                value={formData.abn}
                onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="licenseNumber" className="block text-sm text-gray-300 mb-1">
                License Number
              </label>
              <input
                id="licenseNumber"
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="insuranceExpiry" className="block text-sm text-gray-300 mb-1">
                Insurance Expiry
              </label>
              <input
                id="insuranceExpiry"
                type="date"
                value={formData.insuranceExpiry}
                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm text-gray-300 mb-1">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="suburb" className="block text-sm text-gray-300 mb-1">
                Suburb
              </label>
              <input
                id="suburb"
                type="text"
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="postcode" className="block text-sm text-gray-300 mb-1">
                Postcode
              </label>
              <input
                id="postcode"
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Preferred Properties */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Preferred Properties</label>
            <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
              {properties.length === 0 ? (
                <p className="text-gray-400 text-sm">No properties available</p>
              ) : (
                <div className="space-y-2">
                  {properties.map((prop) => (
                    <label key={prop._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferredProperties.includes(prop._id)}
                        onChange={() => toggleProperty(prop._id)}
                        className="rounded bg-gray-600 border-gray-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-300 text-sm">
                        {prop.propertyName || prop.addressLine1} - {prop.suburb}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Select properties this contractor regularly works on
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isSubmitting ? "Saving..." : contractor ? "Update" : "Add Contractor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
