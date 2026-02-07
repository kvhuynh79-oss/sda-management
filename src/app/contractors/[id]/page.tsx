"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import CommunicationsHistory from "../../../components/CommunicationsHistory";
import Link from "next/link";

const SPECIALTY_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliances: "Appliances",
  building: "Building",
  grounds: "Grounds",
  safety: "Safety",
  general: "General",
  multi_trade: "Multi-Trade",
};

export default function ContractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractorId = params.id as Id<"contractors">;

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(storedUser);
    setUserId(user.id as Id<"users">);
  }, [router]);

  const contractor = useQuery(api.contractors.getById, { contractorId });
  const jobHistory = useQuery(api.contractors.getJobHistory, { contractorId });
  const updateContractor = useMutation(api.contractors.update);

  if (contractor === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="contractors" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (contractor === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="contractors" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">Contractor not found</p>
            <Link
              href="/contractors"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Contractors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditForm({
      companyName: contractor.companyName,
      contactName: contractor.contactName || "",
      email: contractor.email,
      phone: contractor.phone || "",
      abn: contractor.abn || "",
      licenseNumber: contractor.licenseNumber || "",
      insuranceExpiry: contractor.insuranceExpiry || "",
      notes: contractor.notes || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!userId) return;
    await updateContractor({
      userId,
      contractorId,
      companyName: editForm.companyName,
      contactName: editForm.contactName || undefined,
      email: editForm.email,
      phone: editForm.phone || undefined,
      abn: editForm.abn || undefined,
      licenseNumber: editForm.licenseNumber || undefined,
      insuranceExpiry: editForm.insuranceExpiry || undefined,
      notes: editForm.notes || undefined,
    });
    setIsEditing(false);
  };

  const isInsuranceExpired = contractor.insuranceExpiry
    ? new Date(contractor.insuranceExpiry) < new Date()
    : false;
  const isInsuranceExpiringSoon = contractor.insuranceExpiry
    ? new Date(contractor.insuranceExpiry) < new Date(Date.now() + 30 * 86400000) && !isInsuranceExpired
    : false;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="contractors" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/contractors"
            className="text-blue-400 hover:text-blue-300"
          >
            &larr; Back to Contractors
          </Link>
        </div>

        {/* Contractor Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-lg font-bold w-full"
                    placeholder="Company Name"
                  />
                  <input
                    value={editForm.contactName}
                    onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white w-full"
                    placeholder="Contact Name"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">
                      {contractor.companyName}
                    </h1>
                    <span
                      className={`px-2 py-0.5 text-sm rounded-full ${
                        contractor.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {contractor.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-0.5 text-sm rounded-full bg-blue-500/20 text-blue-400">
                      {SPECIALTY_LABELS[contractor.specialty] || contractor.specialty}
                    </span>
                  </div>
                  {contractor.contactName && (
                    <p className="text-gray-400 mt-1">Contact: {contractor.contactName}</p>
                  )}
                </>
              )}
              {contractor.rating && !isEditing && (
                <div className="flex items-center text-yellow-400 mt-2">
                  {"★".repeat(contractor.rating)}
                  {"☆".repeat(5 - contractor.rating)}
                  <span className="text-gray-400 ml-2 text-sm">
                    ({contractor.rating}/5)
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <a
                    href={`mailto:${contractor.email}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Send Email
                  </a>
                  {contractor.phone && (
                    <a
                      href={`tel:${contractor.phone}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      Call
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Contact & Business Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ABN</label>
                  <input
                    value={editForm.abn}
                    onChange={(e) => setEditForm({ ...editForm, abn: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">License Number</label>
                  <input
                    value={editForm.licenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={editForm.insuranceExpiry}
                    onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <a
                    href={`mailto:${contractor.email}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {contractor.email}
                  </a>
                </div>
                {contractor.phone && (
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <a
                      href={`tel:${contractor.phone}`}
                      className="text-white hover:text-gray-300"
                    >
                      {contractor.phone}
                    </a>
                  </div>
                )}
                {contractor.abn && (
                  <div>
                    <p className="text-sm text-gray-400">ABN</p>
                    <p className="text-white">{contractor.abn}</p>
                  </div>
                )}
                {contractor.licenseNumber && (
                  <div>
                    <p className="text-sm text-gray-400">License Number</p>
                    <p className="text-white">{contractor.licenseNumber}</p>
                  </div>
                )}
                {contractor.insuranceExpiry && (
                  <div>
                    <p className="text-sm text-gray-400">Insurance Expiry</p>
                    <p className={`${
                      isInsuranceExpired
                        ? "text-red-400"
                        : isInsuranceExpiringSoon
                          ? "text-yellow-400"
                          : "text-white"
                    }`}>
                      {contractor.insuranceExpiry}
                      {isInsuranceExpired && " (EXPIRED)"}
                      {isInsuranceExpiringSoon && " (Expiring soon)"}
                    </p>
                  </div>
                )}
                {contractor.suburb && (
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white">
                      {[contractor.address, contractor.suburb, contractor.state, contractor.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Secondary Specialties */}
          {contractor.secondarySpecialties && contractor.secondarySpecialties.length > 0 && !isEditing && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-2">Secondary Specialties</p>
              <div className="flex flex-wrap gap-2">
                {contractor.secondarySpecialties.map((spec) => (
                  <span
                    key={spec}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Properties */}
          {contractor.properties && contractor.properties.length > 0 && !isEditing && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-2">Preferred Properties</p>
              <div className="flex flex-wrap gap-2">
                {contractor.properties.filter(Boolean).map((prop) => prop && (
                  <Link
                    key={prop._id}
                    href={`/properties/${prop._id}`}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                  >
                    {prop.propertyName || prop.addressLine1}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {isEditing ? (
            <div className="mt-6">
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          ) : (
            contractor.notes && (
              <div className="mt-6">
                <p className="text-sm text-gray-400 mb-1">Notes</p>
                <p className="text-gray-300">{contractor.notes}</p>
              </div>
            )
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div>
              <p className="text-2xl font-bold text-white">
                {jobHistory?.totalQuotes || 0}
              </p>
              <p className="text-sm text-gray-400">Total Quotes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {jobHistory?.acceptedQuotes || 0}
              </p>
              <p className="text-sm text-gray-400">Jobs Won</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                ${((jobHistory?.totalValue || 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-gray-400">Total Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {contractor.totalJobsCompleted || 0}
              </p>
              <p className="text-sm text-gray-400">Jobs Completed</p>
            </div>
          </div>
        </div>

        {/* Job History */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Job History</h2>

          {!jobHistory?.jobs || jobHistory.jobs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No completed jobs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {jobHistory.jobs.filter(Boolean).map((job) => job && (
                <div
                  key={job.quote._id}
                  className="bg-gray-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <h3 className="text-white font-medium">
                      {job.request.title || job.request.description?.slice(0, 60)}
                    </h3>
                    {job.property && (
                      <p className="text-gray-400 text-sm mt-1">
                        {job.property.propertyName || job.property.addressLine1}, {job.property.suburb}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-green-400 text-sm font-medium">
                        ${job.quote.quoteAmount.toLocaleString()}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        job.request.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : job.request.status === "in_progress"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {job.request.status?.replace(/_/g, " ") || "pending"}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/maintenance/${job.request._id}`}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors whitespace-nowrap"
                  >
                    View Request
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Communications History */}
        <CommunicationsHistory
          stakeholderEntityType="contractor"
          stakeholderEntityId={contractorId}
        />
      </main>
    </div>
  );
}
