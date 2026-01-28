"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NewPaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const participants = useQuery(api.participants.getAll);
  const createPayment = useMutation(api.payments.create);

  const [formData, setFormData] = useState({
    participantId: "",
    planId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentPeriodStart: "",
    paymentPeriodEnd: "",
    expectedAmount: "",
    actualAmount: "",
    paymentSource: "ndia" as "ndia" | "plan_manager" | "self_managed",
    paymentMethod: "",
    paymentReference: "",
    notes: "",
  });

  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (formData.participantId && participants) {
      const participant = participants.find((p) => p._id === formData.participantId);
      setSelectedParticipant(participant || null);

      // Auto-select current plan if available
      if (participant?.currentPlan) {
        const currentPlan = participant.currentPlan;
        setFormData((prev) => {
          // Auto-fill expected amount from daily rate
          if (prev.paymentPeriodStart && prev.paymentPeriodEnd) {
            const days = calculateDays(prev.paymentPeriodStart, prev.paymentPeriodEnd);
            const expected = days * currentPlan.dailySdaRate;
            return { ...prev, planId: currentPlan._id, expectedAmount: expected.toFixed(2) };
          }
          return { ...prev, planId: currentPlan._id };
        });
      }
    }
  }, [formData.participantId, participants]);

  useEffect(() => {
    // Auto-calculate expected amount when period changes
    if (
      selectedParticipant?.currentPlan &&
      formData.paymentPeriodStart &&
      formData.paymentPeriodEnd
    ) {
      const currentPlan = selectedParticipant.currentPlan;
      const days = calculateDays(formData.paymentPeriodStart, formData.paymentPeriodEnd);
      const expected = days * currentPlan.dailySdaRate;
      setFormData((prev) => ({ ...prev, expectedAmount: expected.toFixed(2) }));
    }
  }, [formData.paymentPeriodStart, formData.paymentPeriodEnd, selectedParticipant]);

  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("User not authenticated");
      return;
    }

    if (!formData.participantId || !formData.planId) {
      setError("Please select a participant and plan");
      return;
    }

    if (!formData.expectedAmount || !formData.actualAmount) {
      setError("Please enter expected and actual amounts");
      return;
    }

    setIsSubmitting(true);

    try {
      await createPayment({
        participantId: formData.participantId as Id<"participants">,
        planId: formData.planId as Id<"participantPlans">,
        paymentDate: formData.paymentDate,
        paymentPeriodStart: formData.paymentPeriodStart,
        paymentPeriodEnd: formData.paymentPeriodEnd,
        expectedAmount: parseFloat(formData.expectedAmount),
        actualAmount: parseFloat(formData.actualAmount),
        paymentSource: formData.paymentSource,
        paymentMethod: formData.paymentMethod || undefined,
        paymentReference: formData.paymentReference || undefined,
        notes: formData.notes || undefined,
        createdBy: user.id as Id<"users">,
      });

      router.push("/payments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const variance =
    formData.actualAmount && formData.expectedAmount
      ? parseFloat(formData.actualAmount) - parseFloat(formData.expectedAmount)
      : 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/payments" className="text-gray-400 hover:text-white">
                Payments
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">Record Payment</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Record Payment</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Participant Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Participant *
              </label>
              <select
                required
                value={formData.participantId}
                onChange={(e) =>
                  setFormData({ ...formData, participantId: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a participant</option>
                {participants?.map((participant) => (
                  <option key={participant._id} value={participant._id}>
                    {participant.firstName} {participant.lastName} - {participant.ndisNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Show current plan info if participant selected */}
            {selectedParticipant?.currentPlan && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Current Plan Details</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Daily Rate:</span>
                    <span className="text-white ml-2">
                      ${selectedParticipant.currentPlan.dailySdaRate.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Plan Period:</span>
                    <span className="text-white ml-2">
                      {selectedParticipant.currentPlan.planStartDate} to{" "}
                      {selectedParticipant.currentPlan.planEndDate}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Payment Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Period Start *
                </label>
                <input
                  type="date"
                  required
                  value={formData.paymentPeriodStart}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentPeriodStart: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Period End *
                </label>
                <input
                  type="date"
                  required
                  value={formData.paymentPeriodEnd}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentPeriodEnd: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Days calculation */}
            {formData.paymentPeriodStart && formData.paymentPeriodEnd && (
              <div className="text-sm text-gray-400">
                Payment period: {calculateDays(formData.paymentPeriodStart, formData.paymentPeriodEnd)}{" "}
                days
              </div>
            )}

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expected Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.expectedAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedAmount: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Actual Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.actualAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, actualAmount: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Variance Display */}
            {(formData.expectedAmount || formData.actualAmount) && (
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Variance:</span>
                  <span
                    className={`font-bold text-lg ${
                      variance === 0
                        ? "text-gray-400"
                        : variance > 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {variance > 0 ? "+" : ""}${variance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Source */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Source *
              </label>
              <select
                required
                value={formData.paymentSource}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentSource: e.target.value as "ndia" | "plan_manager" | "self_managed",
                  })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ndia">NDIA Managed</option>
                <option value="plan_manager">Plan Manager</option>
                <option value="self_managed">Self Managed</option>
              </select>
            </div>

            {/* Payment Method & Reference */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method
                </label>
                <input
                  type="text"
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentMethod: e.target.value })
                  }
                  placeholder="e.g., Bank transfer, Direct deposit"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={formData.paymentReference}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentReference: e.target.value })
                  }
                  placeholder="Transaction ID or reference number"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any additional information about this payment..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? "Recording Payment..." : "Record Payment"}
              </button>
              <Link
                href="/payments"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(
    null
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              SDA Management
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link
                href="/participants"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Participants
              </Link>
              <Link href="/payments" className="text-white font-medium">
                Payments
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
