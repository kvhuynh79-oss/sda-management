"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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

export default function ContractorsContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");

  const contractors = useQuery(api.contractors.getAll);
  const properties = useQuery(api.properties.getAll);
  const createContractor = useMutation(api.contractors.create);
  const updateContractor = useMutation(api.contractors.update);
  const removeContractor = useMutation(api.contractors.remove);

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

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div />
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Contractors</p>
          <p className="text-2xl font-bold text-blue-400">{contractors?.length || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Plumbers</p>
          <p className="text-2xl font-bold text-blue-400">
            {contractors?.filter((c) => c.specialty === "plumbing").length || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Electricians</p>
          <p className="text-2xl font-bold text-yellow-400">
            {contractors?.filter((c) => c.specialty === "electrical").length || 0}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Multi-Trade</p>
          <p className="text-2xl font-bold text-purple-400">
            {contractors?.filter((c) => c.specialty === "multi_trade").length || 0}
          </p>
        </div>
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
                  <span>{contractor.email}</span>
                </div>
                {contractor.phone && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>{contractor.phone}</span>
                  </div>
                )}
                {contractor.licenseNumber && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>Lic: {contractor.licenseNumber}</span>
                  </div>
                )}
              </div>

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
    </>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Specialty *</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
            <label className="block text-sm text-gray-300 mb-1">Insurance Expiry</label>
            <input
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {properties.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Preferred Properties</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {properties.map((prop) => (
                  <label key={prop._id} className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.preferredProperties.includes(prop._id)}
                      onChange={() => toggleProperty(prop._id)}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                    {prop.propertyName || prop.addressLine1}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? "Saving..." : contractor ? "Save Changes" : "Add Contractor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
