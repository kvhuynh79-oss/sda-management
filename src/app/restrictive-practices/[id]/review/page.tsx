"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { formatDate } from "@/utils/format";

const REVIEW_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "6_monthly", label: "Every 6 months" },
  { value: "annually", label: "Annually" },
];

function calculateNextReview(frequency: string, fromDate: string): string {
  const date = new Date(fromDate);
  switch (frequency) {
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "6_monthly": date.setMonth(date.getMonth() + 6); break;
    case "annually": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split("T")[0];
}

export default function ReviewRestrictivePracticePage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as Id<"restrictivePractices">;

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const practice = useQuery(api.restrictivePractices.getById, userId ? { id: practiceId, userId } : "skip");
  const conductReview = useMutation(api.restrictivePractices.conductReview);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    reviewNotes: "",
    status: "active" as "active" | "under_review" | "expired" | "ceased",
    reductionStrategy: "",
    reviewFrequency: "quarterly",
    nextReviewDate: calculateNextReview("quarterly", today),
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (practice) {
      setFormData((prev) => ({
        ...prev,
        status: practice.status as typeof prev.status,
        reductionStrategy: practice.reductionStrategy || "",
        reviewFrequency: practice.reviewFrequency,
        nextReviewDate: calculateNextReview(practice.reviewFrequency, today),
      }));
    }
  }, [practice, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.reviewNotes.trim()) {
        throw new Error("Review notes are required");
      }

      await conductReview({
        id: practiceId,
        userId: user.id as Id<"users">,
        reviewNotes: formData.reviewNotes,
        nextReviewDate: formData.nextReviewDate,
        status: formData.status,
        reductionStrategy: formData.reductionStrategy || undefined,
      });

      router.push(`/restrictive-practices/${practiceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
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
          <h1 className="text-2xl font-bold text-white mb-2">Conduct Review</h1>
          <p className="text-gray-400 mb-6">
            Review the {practice.practiceTypeLabel?.toLowerCase()} restrictive practice for {practice.participantName}.
            {practice.lastReviewDate && <span> Last reviewed: {formatDate(practice.lastReviewDate)}.</span>}
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6 text-red-400 text-sm">{error}</div>
          )}

          {/* Current Status Summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Current Practice Summary</h3>
            <p className="text-white text-sm">{practice.description}</p>
            <p className="text-gray-400 text-sm mt-2">
              <span className="text-gray-500">Current reduction strategy:</span> {practice.reductionStrategy}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Review Notes *</label>
              <textarea
                value={formData.reviewNotes}
                onChange={(e) => setFormData({ ...formData, reviewNotes: e.target.value })}
                required
                rows={4}
                placeholder="Document your review findings, observations, and recommendations..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Updated Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="active">Active (continue practice)</option>
                <option value="under_review">Under Review (further assessment needed)</option>
                <option value="ceased">Ceased (practice no longer required)</option>
                <option value="expired">Expired (authorisation expired)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Updated Reduction Strategy</label>
              <textarea
                value={formData.reductionStrategy}
                onChange={(e) => setFormData({ ...formData, reductionStrategy: e.target.value })}
                rows={3}
                placeholder="Update the plan to reduce or eliminate this practice (leave blank to keep current strategy)..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Review Frequency</label>
                <select
                  value={formData.reviewFrequency}
                  onChange={(e) => {
                    const freq = e.target.value;
                    setFormData({
                      ...formData,
                      reviewFrequency: freq,
                      nextReviewDate: calculateNextReview(freq, today),
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {REVIEW_FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Next Review Date</label>
                <input
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {isSubmitting ? "Submitting..." : "Submit Review"}
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
