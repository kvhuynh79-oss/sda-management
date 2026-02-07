"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { FormInput } from "@/components/forms/FormInput";
import { FormSelect } from "@/components/forms/FormSelect";
import { formatCurrency, formatDate, formatStatus } from "@/utils/format";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "ndia", label: "NDIA Managed" },
  { value: "plan_manager", label: "Plan Manager" },
  { value: "self_managed", label: "Self Managed" },
];

function PaymentsContent() {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Auth state from localStorage (useAuth pattern)
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  // Read user from localStorage on mount
  useState(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userId = parsed._id || parsed.id;
        if (userId) {
          setUser({ id: userId, role: parsed.role });
        }
      } catch {
        // Invalid data
      }
    }
  });

  const payments = useQuery(
    api.payments.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Memoize filtered payments
  const filteredPayments = useMemo(() => {
    if (!payments) return undefined;
    return payments.filter((payment) => {
      const matchesSource = filterSource === "all" || payment.paymentSource === filterSource;
      const matchesSearch =
        !searchTerm ||
        payment.participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.participant?.ndisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSource && matchesSearch;
    });
  }, [payments, filterSource, searchTerm]);

  // Memoize totals
  const { totalExpected, totalActual, totalVariance } = useMemo(() => {
    const expected = filteredPayments?.reduce((sum, p) => sum + p.expectedAmount, 0) || 0;
    const actual = filteredPayments?.reduce((sum, p) => sum + p.actualAmount, 0) || 0;
    return { totalExpected: expected, totalActual: actual, totalVariance: actual - expected };
  }, [filteredPayments]);

  if (!user) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Payment History</h1>
            <p className="text-gray-400 mt-1">Track and manage SDA payments</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/payments/ndis-export"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              NDIS Export
            </Link>
            <Link
              href="/payments/distributions"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              Owner Distributions
            </Link>
            <Link
              href="/payments/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              + Record Payment
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Expected"
            value={formatCurrency(totalExpected)}
            color="blue"
          />
          <StatCard
            title="Total Received"
            value={formatCurrency(totalActual)}
            color="green"
          />
          <StatCard
            title="Total Variance"
            value={formatCurrency(totalVariance)}
            color={totalVariance >= 0 ? "green" : "red"}
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Search Participant"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, NDIS number, or reference..."
            />
            <FormSelect
              label="Payment Source"
              options={SOURCE_OPTIONS}
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              placeholder=""
            />
          </div>
        </div>

        {/* Payments List */}
        {payments === undefined ? (
          <LoadingScreen fullScreen={false} message="Loading payments..." />
        ) : filteredPayments && filteredPayments.length === 0 ? (
          <EmptyState
            title={searchTerm || filterSource !== "all" ? "No payments found" : "No payments recorded yet"}
            description={
              searchTerm || filterSource !== "all"
                ? "Try adjusting your filters to see more results"
                : "Start tracking payments by recording your first payment"
            }
            isFiltered={searchTerm !== "" || filterSource !== "all"}
            action={
              !(searchTerm || filterSource !== "all")
                ? { label: "+ Record First Payment", href: "/payments/new" }
                : undefined
            }
            icon={
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Expected
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actual
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Variance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredPayments?.map((payment) => (
                    <PaymentRow key={payment._id} payment={payment} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results count */}
        {filteredPayments && filteredPayments.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-4">
            Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}

function PaymentRow({ payment }: { payment: any }) {
  const getVarianceColor = (variance: number) => {
    if (variance === 0) return "text-gray-400";
    if (variance > 0) return "text-green-400";
    return "text-red-400";
  };

  return (
    <tr className="hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
        {formatDate(payment.paymentDate)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {payment.participant ? (
          <Link
            href={`/participants/${payment.participant._id}`}
            className="text-blue-400 hover:text-blue-300 text-sm focus:outline-none focus-visible:underline"
          >
            {payment.participant.firstName} {payment.participant.lastName}
          </Link>
        ) : (
          <span className="text-gray-400 text-sm">Unknown</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {formatDate(payment.paymentPeriodStart)} to {formatDate(payment.paymentPeriodEnd)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
        {formatCurrency(payment.expectedAmount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
        {formatCurrency(payment.actualAmount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <span className={`font-medium ${getVarianceColor(payment.variance)}`}>
          {payment.variance > 0 ? "+" : ""}
          {formatCurrency(payment.variance)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {formatStatus(payment.paymentSource)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {payment.paymentReference || "-"}
      </td>
    </tr>
  );
}

export default function PaymentsPage() {
  return (
    <RequireAuth>
      <PaymentsContent />
    </RequireAuth>
  );
}
