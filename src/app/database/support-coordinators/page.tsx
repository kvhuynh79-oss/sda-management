"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";
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

export default function SupportCoordinatorsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"supportCoordinators"> | null>(null);
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
    areas: [] as string[],
    customArea: "",
    relationship: "",
    notes: "",
    rating: 0,
  });

  const coordinators = useQuery(api.supportCoordinators.getAll, userId ? {
    userId,
    status: statusFilter === "all" ? undefined : statusFilter,
  } : "skip");
  const createCoordinator = useMutation(api.supportCoordinators.create);
  const updateCoordinator = useMutation(api.supportCoordinators.update);
  const removeCoordinator = useMutation(api.supportCoordinators.remove);
  const { confirm: confirmDialog } = useConfirmDialog();

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      organization: "",
      email: "",
      phone: "",
      areas: [],
      customArea: "",
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
      await updateCoordinator({
        userId,
        coordinatorId: editingId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        areas: allAreas,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    } else {
      await createCoordinator({
        userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization || undefined,
        email: formData.email,
        phone: formData.phone || undefined,
        areas: allAreas,
        relationship: formData.relationship || undefined,
        notes: formData.notes || undefined,
        rating: formData.rating || undefined,
      });
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (coordinator: NonNullable<typeof coordinators>[0]) => {
    // Separate predefined areas from custom areas
    const predefinedAreas = coordinator.areas.filter((a) => SYDNEY_REGIONS.includes(a));
    const customAreas = coordinator.areas.filter((a) => !SYDNEY_REGIONS.includes(a));

    setFormData({
      firstName: coordinator.firstName,
      lastName: coordinator.lastName,
      organization: coordinator.organization || "",
      email: coordinator.email,
      phone: coordinator.phone || "",
      areas: predefinedAreas,
      customArea: customAreas.join(", "),
      relationship: coordinator.relationship || "",
      notes: coordinator.notes || "",
      rating: coordinator.rating || 0,
    });
    setEditingId(coordinator._id);
    setShowAddModal(true);
  };

  const handleDelete = async (id: Id<"supportCoordinators">) => {
    if (!userId) return;
    if (await confirmDialog({ title: "Confirm Delete", message: "Are you sure you want to delete this support coordinator?", variant: "danger" })) {
      await removeCoordinator({ userId, coordinatorId: id });
    }
  };

  const handleToggleStatus = async (coordinator: NonNullable<typeof coordinators>[0]) => {
    if (!userId) return;
    await updateCoordinator({
      userId,
      coordinatorId: coordinator._id,
      status: coordinator.status === "active" ? "inactive" : "active",
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

  // Filter coordinators by search term
  const filteredCoordinators = coordinators?.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      (c.organization && c.organization.toLowerCase().includes(term)) ||
      c.email.toLowerCase().includes(term) ||
      c.areas.some((a) => a.toLowerCase().includes(term))
    );
  });

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Coordinators</h1>
            <p className="text-gray-400 mt-1">
              Manage support coordinators and their participant relationships
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
          >
            + Add Coordinator
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, organization, or area..."
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

        {/* Coordinators List */}
        {!coordinators ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        ) : filteredCoordinators?.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No support coordinators found</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="mt-4 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Add Your First Coordinator
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCoordinators?.map((coordinator) => (
              <div
                key={coordinator._id}
                className="bg-gray-800 rounded-lg p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {coordinator.firstName} {coordinator.lastName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          coordinator.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {coordinator.status}
                      </span>
                      {coordinator.rating && (
                        <div className="flex items-center text-yellow-400">
                          {"★".repeat(coordinator.rating)}
                          {"☆".repeat(5 - coordinator.rating)}
                        </div>
                      )}
                    </div>
                    {coordinator.organization && (
                      <p className="text-gray-400 mt-1">{coordinator.organization}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a
                        href={`mailto:${coordinator.email}`}
                        className="text-teal-500 hover:text-teal-400 text-sm"
                      >
                        {coordinator.email}
                      </a>
                      {coordinator.phone && (
                        <a
                          href={`tel:${coordinator.phone}`}
                          className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                          {coordinator.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {coordinator.areas.map((area) => (
                        <span
                          key={area}
                          className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                    {coordinator.relationship && (
                      <p className="text-gray-400 text-sm mt-2 italic">
                        {coordinator.relationship}
                      </p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="text-gray-400">
                        <span className="text-white font-medium">{coordinator.participantCount}</span> linked participants
                      </span>
                      {coordinator.totalReferrals !== undefined && coordinator.totalReferrals > 0 && (
                        <span className="text-gray-400">
                          <span className="text-green-400 font-medium">{coordinator.totalReferrals}</span> referrals
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/database/support-coordinators/${coordinator._id}`}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEdit(coordinator)}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(coordinator)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        coordinator.status === "active"
                          ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400"
                          : "bg-green-600/20 hover:bg-green-600/30 text-green-400"
                      }`}
                    >
                      {coordinator.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(coordinator._id)}
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
              {editingId ? "Edit Support Coordinator" : "Add Support Coordinator"}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData({ ...formData, organization: e.target.value })
                  }
                  placeholder="e.g., NDIS Support Services"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
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
                  How We Know Them
                </label>
                <input
                  type="text"
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData({ ...formData, relationship: e.target.value })
                  }
                  placeholder="e.g., Referred by John Smith, Met at conference..."
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
                  {editingId ? "Save Changes" : "Add Coordinator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}
