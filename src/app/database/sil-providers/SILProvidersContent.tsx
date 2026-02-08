"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const SYDNEY_REGIONS = [
  "Northern Sydney",
  "North Shore",
  "Northern Beaches",
  "Inner West",
  "Eastern Suburbs",
  "Western Sydney",
  "South Western Sydney",
  "Southern Sydney",
  "Hills District",
  "Central Coast",
  "Newcastle/Hunter",
  "Wollongong/Illawarra",
  "Blue Mountains",
  "Other",
];

const SIL_SERVICES = [
  "24/7 Support",
  "Daily Living Assistance",
  "Community Access",
  "Personal Care",
  "Medication Support",
  "Meal Preparation",
  "Household Tasks",
  "Transport",
  "Behaviour Support",
  "Complex Care",
];

export default function SILProvidersContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"silProviders"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserId(user.id as Id<"users">);
    }
  }, []);

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    areas: [] as string[],
    customArea: "",
    services: [] as string[],
    ndisRegistrationNumber: "",
    relationship: "",
    notes: "",
    rating: 0,
  });

  const providers = useQuery(api.silProviders.getAll, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const createProvider = useMutation(api.silProviders.create);
  const updateProvider = useMutation(api.silProviders.update);
  const removeProvider = useMutation(api.silProviders.remove);

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      areas: [],
      customArea: "",
      services: [],
      ndisRegistrationNumber: "",
      relationship: "",
      notes: "",
      rating: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allAreas = [...formData.areas];
    if (formData.customArea.trim()) {
      allAreas.push(formData.customArea.trim());
    }

    if (!userId) return;

    if (editingId) {
      await updateProvider({
        userId,
        providerId: editingId,
        companyName: formData.companyName,
        contactName: formData.contactName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        areas: allAreas,
        services: formData.services.length > 0 ? formData.services : undefined,
        ndisRegistrationNumber: formData.ndisRegistrationNumber || undefined,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    } else {
      await createProvider({
        userId,
        companyName: formData.companyName,
        contactName: formData.contactName || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        areas: allAreas,
        services: formData.services.length > 0 ? formData.services : undefined,
        ndisRegistrationNumber: formData.ndisRegistrationNumber || undefined,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (provider: NonNullable<typeof providers>[0]) => {
    const predefinedAreas = provider.areas.filter((a) => SYDNEY_REGIONS.includes(a));
    const customAreas = provider.areas.filter((a) => !SYDNEY_REGIONS.includes(a));

    setFormData({
      companyName: provider.companyName,
      contactName: provider.contactName || "",
      email: provider.email,
      phone: provider.phone || "",
      areas: predefinedAreas,
      customArea: customAreas.join(", "),
      services: provider.services || [],
      ndisRegistrationNumber: provider.ndisRegistrationNumber || "",
      relationship: provider.relationship || "",
      notes: provider.notes || "",
      rating: provider.rating || 0,
    });
    setEditingId(provider._id);
    setShowAddModal(true);
  };

  const handleDelete = async (id: Id<"silProviders">) => {
    if (!userId) return;
    if (confirm("Are you sure you want to delete this SIL provider?")) {
      await removeProvider({ providerId: id, userId });
    }
  };

  const handleToggleStatus = async (provider: NonNullable<typeof providers>[0]) => {
    if (!userId) return;
    await updateProvider({
      userId,
      providerId: provider._id,
      status: provider.status === "active" ? "inactive" : "active",
    });
  };

  const toggleArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      areas: prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area],
    }));
  };

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const filteredProviders = providers?.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.companyName.toLowerCase().includes(term) ||
      (p.contactName && p.contactName.toLowerCase().includes(term)) ||
      p.email.toLowerCase().includes(term) ||
      p.areas.some((a) => a.toLowerCase().includes(term))
    );
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">SIL Providers</h3>
          <p className="text-gray-400 text-sm">Manage Supported Independent Living providers</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add SIL Provider
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by company, contact, or area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* List */}
      {!providers ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      ) : filteredProviders?.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No SIL providers found</p>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Your First SIL Provider
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProviders?.map((provider) => (
            <div key={provider._id} className="bg-gray-800 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{provider.companyName}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      provider.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {provider.status}
                    </span>
                    {provider.rating && (
                      <div className="flex items-center text-yellow-400">
                        {"★".repeat(provider.rating)}{"☆".repeat(5 - provider.rating)}
                      </div>
                    )}
                  </div>
                  {provider.contactName && <p className="text-gray-400 mt-1">Contact: {provider.contactName}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <a href={`mailto:${provider.email}`} className="text-blue-400 hover:text-blue-300 text-sm">{provider.email}</a>
                    {provider.phone && <a href={`tel:${provider.phone}`} className="text-gray-400 hover:text-gray-300 text-sm">{provider.phone}</a>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {provider.areas.map((area) => (
                      <span key={area} className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">{area}</span>
                    ))}
                  </div>
                  {provider.services && provider.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.services.map((service) => (
                        <span key={service} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">{service}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-gray-400">
                      <span className="text-white font-medium">{provider.participantCount}</span> linked participants
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(provider)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">Edit</button>
                  <button onClick={() => handleToggleStatus(provider)} className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    provider.status === "active" ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400" : "bg-green-600/20 hover:bg-green-600/30 text-green-400"
                  }`}>{provider.status === "active" ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => handleDelete(provider._id)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">{editingId ? "Edit SIL Provider" : "Add SIL Provider"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">NDIS Registration #</label>
                  <input type="text" value={formData.ndisRegistrationNumber} onChange={(e) => setFormData({ ...formData, ndisRegistrationNumber: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Areas Covered *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {SYDNEY_REGIONS.map((area) => (
                    <button key={area} type="button" onClick={() => toggleArea(area)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${formData.areas.includes(area) ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>{area}</button>
                  ))}
                </div>
                <input type="text" value={formData.customArea} onChange={(e) => setFormData({ ...formData, customArea: e.target.value })} placeholder="Or enter custom area(s)..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Services Offered</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SIL_SERVICES.map((service) => (
                    <button key={service} type="button" onClick={() => toggleService(service)} className={`px-3 py-2 text-sm rounded-lg transition-colors ${formData.services.includes(service) ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>{service}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">How We Know Them</label>
                <input type="text" value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} placeholder="e.g., Existing partner, Referred by..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setFormData({ ...formData, rating: star })} className={`text-2xl ${star <= formData.rating ? "text-yellow-400" : "text-gray-600"}`}>★</button>
                  ))}
                  {formData.rating > 0 && <button type="button" onClick={() => setFormData({ ...formData, rating: 0 })} className="text-sm text-gray-400 hover:text-gray-300 ml-2">Clear</button>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Any additional notes..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">{editingId ? "Save Changes" : "Add Provider"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
