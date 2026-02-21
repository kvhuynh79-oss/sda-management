"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";

const CATEGORY_OPTIONS = [
  { value: "ndis_orientation", label: "NDIS Worker Orientation" },
  { value: "first_aid", label: "First Aid & CPR" },
  { value: "manual_handling", label: "Manual Handling" },
  { value: "medication_management", label: "Medication Management" },
  { value: "behaviour_support", label: "Behaviour Support" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "infection_control", label: "Infection Control" },
  { value: "restrictive_practices", label: "Restrictive Practices" },
  { value: "cultural_competency", label: "Cultural Competency" },
  { value: "other", label: "Other" },
];

const STATUS_BADGES: Record<string, string> = {
  not_started: "bg-gray-500/20 text-gray-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  expired: "bg-red-500/20 text-red-400",
};

export default function StaffTrainingPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as Id<"users">;
  const { confirm: confirmDialog } = useConfirmDialog();

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const trainingRecords = useQuery(api.staffTraining.getByStaff, userId ? { staffId, userId } : "skip");
  const staffUser = useQuery(api.auth.getAllUsers, userId ? { userId } : "skip");
  const createTraining = useMutation(api.staffTraining.create);
  const updateTraining = useMutation(api.staffTraining.update);
  const removeTraining = useMutation(api.staffTraining.remove);

  const staffMember = useMemo(() => {
    return staffUser?.find((u) => u._id === staffId);
  }, [staffUser, staffId]);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    trainingName: "",
    trainingType: "mandatory" as "mandatory" | "recommended" | "specialised",
    category: "ndis_orientation" as string,
    provider: "",
    completedDate: "",
    expiryDate: "",
    status: "not_started" as "not_started" | "in_progress" | "completed" | "expired",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSubmitting(true);
    try {
      await createTraining({
        userId: user.id as Id<"users">,
        staffId,
        trainingName: formData.trainingName,
        trainingType: formData.trainingType,
        category: formData.category as any,
        provider: formData.provider || undefined,
        completedDate: formData.completedDate || undefined,
        expiryDate: formData.expiryDate || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });
      setShowAddForm(false);
      setFormData({
        trainingName: "", trainingType: "mandatory", category: "ndis_orientation",
        provider: "", completedDate: "", expiryDate: "", status: "not_started", notes: "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add training");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async (recordId: Id<"staffTraining">) => {
    if (!user) return;
    await updateTraining({
      id: recordId,
      userId: user.id as Id<"users">,
      status: "completed",
      completedDate: today,
    });
  };

  const handleDelete = async (recordId: Id<"staffTraining">) => {
    if (!user) return;
    const confirmed = await confirmDialog({ title: "Delete Training Record", message: "Are you sure you want to remove this training record?", confirmLabel: "Delete", variant: "danger" });
    if (confirmed) {
      await removeTraining({ id: recordId, userId: user.id as Id<"users"> });
    }
  };

  if (!user) return null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/compliance/staff/training-matrix" className="text-teal-400 hover:text-teal-300 text-sm mb-4 inline-block">
            &larr; Back to Training Matrix
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Training Records — {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Staff Member"}
              </h1>
              <p className="mt-1 text-gray-400">
                Manage training certificates and compliance records
              </p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Training
              </button>
              <Link
                href={`/compliance/staff/${staffId}/competencies`}
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Competencies
              </Link>
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Add Training Record</h3>
              {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Training Name *</label>
                    <input type="text" value={formData.trainingName} onChange={(e) => setFormData({ ...formData, trainingName: e.target.value })} required placeholder="e.g. HLTAID011 Provide First Aid" className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <select value={formData.trainingType} onChange={(e) => setFormData({ ...formData, trainingType: e.target.value as any })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="mandatory">Mandatory</option>
                      <option value="recommended">Recommended</option>
                      <option value="specialised">Specialised</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                    <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} placeholder="Training provider name" className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Completed Date</label>
                    <input type="date" value={formData.completedDate} onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Expiry Date</label>
                    <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                    {isSubmitting ? "Adding..." : "Add Training"}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Records List */}
          {!trainingRecords ? (
            <LoadingScreen />
          ) : trainingRecords.length === 0 ? (
            <EmptyState title="No training records" description="Click 'Add Training' to log a training record for this staff member." />
          ) : (
            <div className="space-y-3">
              {trainingRecords.map((record) => {
                const isExpired = record.expiryDate && record.expiryDate < today;
                const isExpiring = record.expiryDate && !isExpired && record.expiryDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                const displayStatus = isExpired ? "expired" : record.status;
                return (
                  <div key={record._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGES[displayStatus]}`}>
                            {displayStatus.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                            {record.trainingTypeLabel}
                          </span>
                          {isExpiring && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-600/30 text-yellow-300">
                              Expiring Soon
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-medium">{record.trainingName}</h3>
                        <p className="text-sm text-gray-400">{record.categoryLabel}</p>
                        {record.provider && <p className="text-xs text-gray-500">Provider: {record.provider}</p>}
                      </div>
                      <div className="text-right text-sm flex items-center gap-3">
                        <div>
                          {record.completedDate && (
                            <div className="text-gray-400">Completed: {formatDate(record.completedDate)}</div>
                          )}
                          {record.expiryDate && (
                            <div className={isExpired ? "text-red-400" : isExpiring ? "text-yellow-400" : "text-gray-400"}>
                              Expires: {formatDate(record.expiryDate)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {record.status !== "completed" && (
                            <button
                              onClick={() => handleMarkComplete(record._id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                              title="Mark as completed"
                            >
                              Complete
                            </button>
                          )}
                          {(user.role === "admin") && (
                            <button
                              onClick={() => handleDelete(record._id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                              title="Delete"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
