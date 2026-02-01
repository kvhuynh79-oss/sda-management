"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Id } from "../../../convex/_generated/dataModel";

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

export default function ContractorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");

  const contractors = useQuery(api.contractors.getAll);
  const properties = useQuery(api.properties.getAll);
  const createContractor = useMutation(api.contractors.create);
  const updateContractor = useMutation(api.contractors.update);
  const removeContractor = useMutation(api.contractors.remove);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const filteredContractors = contractors?.filter((contractor) => {
    const matchesSearch =
      !searchTerm ||
      contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      filterSpecialty === "all" || contractor.specialty === filterSpecialty;

    return matchesSearch && matchesSpecialty;
  });

  const getSpecialtyBadge = (specialty: string) => {
    const colors: Record<string, string> = {
      plumbing: "bg-blue-600",
      electrical: "bg-yellow-600",
      appliances: "bg-purple-600",
      building: "bg-orange-600",
      grounds: "bg-green-600",
      safety: "bg-red-600",
      general: "bg-gray-600",
      multi_trade: "bg-indigo-600",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full text-white ${colors[specialty] || "bg-gray-600"}`}>
        {specialty.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="operations" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Contractors</h2>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage trade contractors for maintenance work</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0 self-start sm:self-auto"
          >
            + Add Contractor
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Contractors" value={contractors?.length?.toString() || "0"} color="blue" />
          <StatCard
            label="Plumbers"
            value={contractors?.filter((c) => c.specialty === "plumbing").length.toString() || "0"}
            color="blue"
          />
          <StatCard
            label="Electricians"
            value={contractors?.filter((c) => c.specialty === "electrical").length.toString() || "0"}
            color="yellow"
          />
          <StatCard
            label="Multi-Trade"
            value={contractors?.filter((c) => c.specialty === "multi_trade").length.toString() || "0"}
            color="purple"
          />
        </div>

        {/* Contractors List */}
        {!filteredContractors ? (
          <div className="text-gray-400 text-center py-8">Loading contractors...</div>
        ) : filteredContractors.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No contractors found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Add your first contractor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContractors.map((contractor) => (
              <div key={contractor._id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{contractor.companyName}</h3>
                    {contractor.contactName && (
                      <p className="text-gray-400 text-sm">{contractor.contactName}</p>
                    )}
                  </div>
                  {getSpecialtyBadge(contractor.specialty)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{contractor.email}</span>
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{contractor.phone}</span>
                    </div>
                  )}
                  {contractor.licenseNumber && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Lic: {contractor.licenseNumber}</span>
                    </div>
                  )}
                </div>

                {contractor.properties && contractor.properties.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-gray-500 text-xs mb-1">Preferred Properties:</p>
                    <div className="flex flex-wrap gap-1">
                      {contractor.properties.slice(0, 3).map((prop: any) => (
                        <span key={prop._id} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                          {prop.propertyName || prop.suburb}
                        </span>
                      ))}
                      {contractor.properties.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-500 text-xs">
                          +{contractor.properties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => setEditingContractor(contractor)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to remove this contractor?")) {
                        removeContractor({ contractorId: contractor._id });
                      }
                    }}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
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
  );
}

function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: string;
  color?: "blue" | "green" | "yellow" | "purple" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
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
        preferredProperties: formData.preferredProperties.length > 0 ? formData.preferredProperties : undefined,
        secondarySpecialties: formData.secondarySpecialties.length > 0 ? formData.secondarySpecialties : undefined,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">
          {contractor ? "Edit Contractor" : "Add Contractor"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Trade Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Primary Specialty *</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">ABN</label>
              <input
                type="text"
                value={formData.abn}
                onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">License Number</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Insurance Expiry</label>
              <input
                type="date"
                value={formData.insuranceExpiry}
                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Suburb</label>
              <input
                type="text"
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Postcode</label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Preferred Properties */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Preferred Properties</label>
            <div className="bg-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
              {properties.length === 0 ? (
                <p className="text-gray-500 text-sm">No properties available</p>
              ) : (
                <div className="space-y-2">
                  {properties.map((prop) => (
                    <label key={prop._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.preferredProperties.includes(prop._id)}
                        onChange={() => toggleProperty(prop._id)}
                        className="rounded bg-gray-600 border-gray-500"
                      />
                      <span className="text-gray-300 text-sm">
                        {prop.propertyName || prop.addressLine1} - {prop.suburb}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Select properties this contractor regularly works on
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : contractor ? "Update" : "Add Contractor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
