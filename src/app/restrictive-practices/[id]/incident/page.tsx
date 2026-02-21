"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";

export default function LogRestrictivePracticeIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as Id<"restrictivePractices">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const practice = useQuery(api.restrictivePractices.getById, userId ? { id: practiceId, userId } : "skip");
  const allUsers = useQuery(api.auth.getAllUsers, userId ? { userId } : "skip");
  const logIncident = useMutation(api.restrictivePractices.logIncident);

  const now = new Date();
  const [formData, setFormData] = useState({
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    duration: "",
    implementedBy: "",
    trigger: "",
    participantResponse: "",
    debrief: "",
    injuries: false,
    injuryDetails: "",
    witnessedBy: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setFormData((prev) => ({ ...prev, implementedBy: parsed.id }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.trigger.trim() || !formData.participantResponse.trim() || !formData.debrief.trim()) {
        throw new Error("Trigger, participant response, and debrief are all required fields");
      }
      if (!formData.duration || Number(formData.duration) <= 0) {
        throw new Error("Duration must be a positive number");
      }

      await logIncident({
        userId: user.id as Id<"users">,
        restrictivePracticeId: practiceId,
        date: formData.date,
        time: formData.time,
        duration: Number(formData.duration),
        implementedBy: (formData.implementedBy || user.id) as Id<"users">,
        trigger: formData.trigger,
        participantResponse: formData.participantResponse,
        debrief: formData.debrief,
        injuries: formData.injuries,
        injuryDetails: formData.injuries ? formData.injuryDetails : undefined,
        witnessedBy: formData.witnessedBy || undefined,
      });

      router.push(`/restrictive-practices/${practiceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log incident");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !practice) return null;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href={`/restrictive-practices/${practiceId}`} className="text-teal-400 hover:text-teal-300 text-sm mb-4 inline-block">
            &larr; Back to Practice Detail
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Log Practice Incident</h1>
          <p className="text-gray-400 mb-6">
            Record an instance of this {practice.practiceTypeLabel?.toLowerCase()} restrictive practice being used for {practice.participantName}.
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Time *</label>
                <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes) *</label>
                <input type="number" min="1" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} required placeholder="e.g. 15" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Implemented By *</label>
              <select value={formData.implementedBy} onChange={(e) => setFormData({ ...formData, implementedBy: e.target.value })} required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select staff member</option>
                {allUsers?.filter((u) => u.isActive).map((u) => (
                  <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Trigger / Antecedent *</label>
              <textarea value={formData.trigger} onChange={(e) => setFormData({ ...formData, trigger: e.target.value })} required rows={2} placeholder="What triggered the use of this restrictive practice?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Participant Response *</label>
              <textarea value={formData.participantResponse} onChange={(e) => setFormData({ ...formData, participantResponse: e.target.value })} required rows={2} placeholder="How did the participant respond?" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Post-Incident Debrief *</label>
              <textarea value={formData.debrief} onChange={(e) => setFormData({ ...formData, debrief: e.target.value })} required rows={2} placeholder="Summary of debrief with participant and staff..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Witnessed By</label>
              <input type="text" value={formData.witnessedBy} onChange={(e) => setFormData({ ...formData, witnessedBy: e.target.value })} placeholder="Name(s) of witnesses" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            <fieldset className="border border-gray-700 rounded-lg p-4">
              <legend className="text-sm font-medium text-gray-300 px-2">Injuries</legend>
              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={formData.injuries} onChange={(e) => setFormData({ ...formData, injuries: e.target.checked })} className="w-4 h-4 rounded border-gray-600 text-teal-600 focus:ring-teal-500" />
                <span className="text-sm text-gray-300">Injuries occurred during this incident</span>
              </label>
              {formData.injuries && (
                <textarea value={formData.injuryDetails} onChange={(e) => setFormData({ ...formData, injuryDetails: e.target.value })} rows={2} placeholder="Describe the injuries..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              )}
            </fieldset>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {isSubmitting ? "Logging..." : "Log Incident"}
              </button>
              <Link href={`/restrictive-practices/${practiceId}`} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-center">
                Cancel
              </Link>
            </div>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}
