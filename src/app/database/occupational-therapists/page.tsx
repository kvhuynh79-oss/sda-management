"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "../../../components/Header";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

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

const OT_SPECIALIZATIONS = [
  "SDA Assessments",
  "AT Prescription",
  "Home Modifications",
  "Functional Capacity",
  "Seating & Positioning",
  "Vehicle Modifications",
  "Complex Rehab",
  "Mental Health",
  "Paediatric",
  "Aged Care",
];

export default function OccupationalTherapistsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"occupationalTherapists"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(storedUser);
    setUserId(user.id as Id<"users">);
  }, [router]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    email: "",
    phone: "",
    abn: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    areas: [] as string[],
    customArea: "",
    specializations: [] as string[],
    ahpraNumber: "",
    relationship: "",
    notes: "",
    rating: 0,
  });

  const therapists = useQuery(api.occupationalTherapists.getAll, userId ? {
    userId,
    status: statusFilter === "all" ? undefined : statusFilter,
  } : "skip");
  const createTherapist = useMutation(api.occupationalTherapists.create);
  const updateTherapist = useMutation(api.occupationalTherapists.update);
  const removeTherapist = useMutation(api.occupationalTherapists.remove);
  const { confirm: confirmDialog } = useConfirmDialog();

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      organization: "",
      email: "",
      phone: "",
      abn: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
      areas: [],
      customArea: "",
      specializations: [],
      ahpraNumber: "",
      relationship: "",
      notes: "",
      rating: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combine predefined areas with custom area if provided
    const allAreas = [...formData.areas];
    if (formData.customArea.trim()) {
      allAreas.push(formData.customArea.trim());
    }

    if (!userId) return;

    if (editingId) {
      await updateTherapist({
        userId,
        otId: editingId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        abn: formData.abn || undefined,
        address: formData.address || undefined,
        suburb: formData.suburb || undefined,
        state: formData.state || undefined,
        postcode: formData.postcode || undefined,
        areas: allAreas,
        specializations: formData.specializations.length > 0 ? formData.specializations : undefined,
        ahpraNumber: formData.ahpraNumber || undefined,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    } else {
      await createTherapist({
        userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        abn: formData.abn || undefined,
        address: formData.address || undefined,
        suburb: formData.suburb || undefined,
        state: formData.state || undefined,
        postcode: formData.postcode || undefined,
        areas: allAreas,
        specializations: formData.specializations.length > 0 ? formData.specializations : undefined,
        ahpraNumber: formData.ahpraNumber || undefined,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (therapist: NonNullable<typeof therapists>[0]) => {
    // Separate predefined areas from custom areas
    const predefinedAreas = therapist.areas.filter((a) => SYDNEY_REGIONS.includes(a));
    const customAreas = therapist.areas.filter((a) => !SYDNEY_REGIONS.includes(a));

    setFormData({
      firstName: therapist.firstName,
      lastName: therapist.lastName,
      organization: therapist.organization || "",
      email: therapist.email,
      phone: therapist.phone || "",
      abn: therapist.abn || "",
      address: therapist.address || "",
      suburb: therapist.suburb || "",
      state: therapist.state || "",
      postcode: therapist.postcode || "",
      areas: predefinedAreas,
      customArea: customAreas.join(", "),
      specializations: therapist.specializations || [],
      ahpraNumber: therapist.ahpraNumber || "",
      relationship: therapist.relationship || "",
      notes: therapist.notes || "",
      rating: therapist.rating || 0,
    });
    setEditingId(therapist._id);
    setShowAddModal(true);
  };

  const handleDelete = async (id: Id<"occupationalTherapists">) => {
    if (!userId) return;
    if (await confirmDialog({ title: "Confirm Delete", message: "Are you sure you want to delete this occupational therapist?", variant: "danger" })) {
      await removeTherapist({ userId, otId: id });
    }
  };

  const handleToggleStatus = async (therapist: NonNullable<typeof therapists>[0]) => {
    if (!userId) return;
    await updateTherapist({
      userId,
      otId: therapist._id,
      status: therapist.status === "active" ? "inactive" : "active",
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

  const toggleSpecialization = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  // Filter therapists by search term
  const filteredTherapists = therapists?.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.firstName.toLowerCase().includes(term) ||
      t.lastName.toLowerCase().includes(term) ||
      (t.organization && t.organization.toLowerCase().includes(term)) ||
      t.email.toLowerCase().includes(term) ||
      t.areas.some((a) => a.toLowerCase().includes(term)) ||
      (t.specializations && t.specializations.some((s) => s.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Occupational Therapists</h1>
            <p className="text-gray-400 mt-1">
              Manage OTs who complete SDA assessments and prescribe AT
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
          >
            + Add OT
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, organization, or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Therapists List */}
        {!therapists ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        ) : filteredTherapists?.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No occupational therapists found</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Add Your First OT
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTherapists?.map((therapist) => (
              <div
                key={therapist._id}
                className="bg-gray-800 rounded-lg p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {therapist.firstName} {therapist.lastName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          therapist.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {therapist.status}
                      </span>
                      {therapist.rating && (
                        <div className="flex items-center text-yellow-400">
                          {"★".repeat(therapist.rating)}
                          {"☆".repeat(5 - therapist.rating)}
                        </div>
                      )}
                    </div>
                    {therapist.organization && (
                      <p className="text-gray-400 mt-1">{therapist.organization}</p>
                    )}
                    {therapist.ahpraNumber && (
                      <p className="text-gray-400 text-sm">AHPRA: {therapist.ahpraNumber}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a
                        href={`mailto:${therapist.email}`}
                        className="text-teal-500 hover:text-teal-400 text-sm"
                      >
                        {therapist.email}
                      </a>
                      {therapist.phone && (
                        <a
                          href={`tel:${therapist.phone}`}
                          className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                          {therapist.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {therapist.areas.map((area) => (
                        <span
                          key={area}
                          className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                    {therapist.specializations && therapist.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {therapist.specializations.map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs rounded"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                    {therapist.relationship && (
                      <p className="text-gray-400 text-sm mt-2 italic">
                        {therapist.relationship}
                      </p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="text-gray-400">
                        <span className="text-white font-medium">{therapist.participantCount}</span> linked participants
                      </span>
                      {therapist.totalAssessments !== undefined && therapist.totalAssessments > 0 && (
                        <span className="text-gray-400">
                          <span className="text-teal-400 font-medium">{therapist.totalAssessments}</span> SDA assessments
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/database/occupational-therapists/${therapist._id}`}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEdit(therapist)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(therapist)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        therapist.status === "active"
                          ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400"
                          : "bg-green-600/20 hover:bg-green-600/30 text-green-400"
                      }`}
                    >
                      {therapist.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(therapist._id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? "Edit Occupational Therapist" : "Add Occupational Therapist"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Organization/Practice
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) =>
                      setFormData({ ...formData, organization: e.target.value })
                    }
                    placeholder="e.g., Allied Health Solutions"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    AHPRA Number
                  </label>
                  <input
                    type="text"
                    value={formData.ahpraNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, ahpraNumber: e.target.value })
                    }
                    placeholder="e.g., OCC0001234567"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Areas Covered *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  {SYDNEY_REGIONS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        formData.areas.includes(area)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.customArea}
                  onChange={(e) =>
                    setFormData({ ...formData, customArea: e.target.value })
                  }
                  placeholder="Or enter custom area(s)..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Specializations
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OT_SPECIALIZATIONS.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        formData.specializations.includes(spec)
                          ? "bg-teal-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  How We Know Them
                </label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData({ ...formData, relationship: e.target.value })
                  }
                  placeholder="e.g., Referred by Support Coordinator, Regular assessor..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, rating: star })
                      }
                      className={`text-2xl ${
                        star <= formData.rating
                          ? "text-yellow-400"
                          : "text-gray-500"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {formData.rating > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: 0 })}
                      className="text-sm text-gray-400 hover:text-gray-300 ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  {editingId ? "Save Changes" : "Add OT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
