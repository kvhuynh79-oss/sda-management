"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";
import { formatDate } from "@/utils/format";

const RATING_BADGES: Record<string, string> = {
  not_competent: "bg-red-500/20 text-red-400",
  developing: "bg-yellow-500/20 text-yellow-400",
  competent: "bg-green-500/20 text-green-400",
  advanced: "bg-teal-500/20 text-teal-400",
};

const RATING_LABELS: Record<string, string> = {
  not_competent: "Not Competent",
  developing: "Developing",
  competent: "Competent",
  advanced: "Advanced",
};

export default function StaffCompetenciesPage() {
  const params = useParams();
  const staffId = params.id as Id<"users">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const competencies = useQuery(api.staffTraining.getCompetencies, userId ? { staffId, userId } : "skip");
  const staffUsers = useQuery(api.auth.getAllUsers, userId ? { userId } : "skip");
  const createCompetency = useMutation(api.staffTraining.createCompetency);

  const staffMember = useMemo(() => {
    return staffUsers?.find((u) => u._id === staffId);
  }, [staffUsers, staffId]);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    competencyName: "",
    rating: "developing" as "not_competent" | "developing" | "competent" | "advanced",
    nextAssessmentDate: "",
    evidence: "",
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
      await createCompetency({
        userId: user.id as Id<"users">,
        staffId,
        competencyName: formData.competencyName,
        assessedDate: today,
        rating: formData.rating,
        nextAssessmentDate: formData.nextAssessmentDate,
        evidence: formData.evidence || undefined,
        notes: formData.notes || undefined,
      });
      setShowAddForm(false);
      setFormData({ competencyName: "", rating: "developing", nextAssessmentDate: "", evidence: "", notes: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add competency");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href={`/compliance/staff/${staffId}/training`} className="text-teal-400 hover:text-teal-300 text-sm mb-4 inline-block">
            &larr; Back to Training Records
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Competency Assessments — {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Staff Member"}
              </h1>
              <p className="mt-1 text-gray-400">Track competency levels and schedule reassessments</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Assessment
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">New Competency Assessment</h3>
              {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Competency Name *</label>
                    <input type="text" value={formData.competencyName} onChange={(e) => setFormData({ ...formData, competencyName: e.target.value })} required placeholder="e.g. Medication Administration" className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Rating *</label>
                    <select value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value as typeof formData.rating })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="not_competent">Not Competent</option>
                      <option value="developing">Developing</option>
                      <option value="competent">Competent</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Next Assessment Date *</label>
                    <input type="date" value={formData.nextAssessmentDate} onChange={(e) => setFormData({ ...formData, nextAssessmentDate: e.target.value })} required className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Evidence</label>
                    <input type="text" value={formData.evidence} onChange={(e) => setFormData({ ...formData, evidence: e.target.value })} placeholder="Reference to evidence document" className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                    {isSubmitting ? "Adding..." : "Add Assessment"}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Records List */}
          {!competencies ? (
            <LoadingScreen />
          ) : competencies.length === 0 ? (
            <EmptyState title="No competency assessments" description="Click 'Add Assessment' to record a competency assessment." />
          ) : (
            <div className="space-y-3">
              {competencies.map((comp) => (
                <div key={comp._id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${RATING_BADGES[comp.rating]}`}>
                          {RATING_LABELS[comp.rating]}
                        </span>
                      </div>
                      <h3 className="text-white font-medium">{comp.competencyName}</h3>
                      <p className="text-sm text-gray-400">Assessed by {comp.assessorName} on {formatDate(comp.assessedDate)}</p>
                      {comp.evidence && <p className="text-xs text-gray-500">Evidence: {comp.evidence}</p>}
                      {comp.notes && <p className="text-xs text-gray-500">Notes: {comp.notes}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-400">Next Assessment</div>
                      <div className={comp.nextAssessmentDate < today ? "text-red-400" : "text-white"}>
                        {formatDate(comp.nextAssessmentDate)}
                        {comp.nextAssessmentDate < today && " (OVERDUE)"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
