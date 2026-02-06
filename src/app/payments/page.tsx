"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function PaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const payments = useQuery(
    api.payments.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  // Filter payments
  const filteredPayments = payments?.filter((payment) => {
    const matchesSource = filterSource === "all" || payment.paymentSource === filterSource;
    const matchesSearch =
      !searchTerm ||
      payment.participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.ndisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSource && matchesSearch;
  });

  // Calculate totals
  const totalExpected = filteredPayments?.reduce((sum, p) => sum + p.expectedAmount, 0) || 0;
  const totalActual = filteredPayments?.reduce((sum, p) => sum + p.actualAmount, 0) || 0;
  const totalVariance = totalActual - totalExpected;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Payment History</h2>
            <p className="text-gray-400 mt-1">Track and manage SDA payments</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/payments/ndis-export"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              NDIS Export
            </Link>
            <Link
              href="/payments/distributions"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Owner Distributions
            </Link>
            <Link
              href="/payments/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + Record Payment
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard
            label="Total Expected"
            value={formatCurrency(totalExpected)}
            color="blue"
          />
          <SummaryCard label="Total Received" value={formatCurrency(totalActual)} color="green" />
          <SummaryCard
            label="Total Variance"
            value={formatCurrency(totalVariance)}
            color={totalVariance >= 0 ? "green" : "red"}
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Participant
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, NDIS number, or reference..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Source
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Sources</option>
                <option value="ndia">NDIA Managed</option>
                <option value="plan_manager">Plan Manager</option>
                <option value="self_managed">Self Managed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments List */}
        {payments === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading payments...</div>
        ) : filteredPayments && filteredPayments.length === 0 ? (
          <EmptyState hasFilters={searchTerm !== "" || filterSource !== "all"} />
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

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function PaymentRow({ payment }: { payment: any }) {
  const getVarianceColor = (variance: number) => {
    if (variance === 0) return "text-gray-400";
    if (variance > 0) return "text-green-400";
    return "text-red-400";
  };

  const formatSource = (source: string) => {
    return source.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <tr className="hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
        {payment.paymentDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {payment.participant ? (
          <Link
            href={`/participants/${payment.participant._id}`}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {payment.participant.firstName} {payment.participant.lastName}
          </Link>
        ) : (
          <span className="text-gray-400 text-sm">Unknown</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {payment.paymentPeriodStart} to {payment.paymentPeriodEnd}
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
        {formatSource(payment.paymentSource)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {payment.paymentReference || "-"}
      </td>
    </tr>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-400 text-6xl mb-4">💰</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No payments found" : "No payments recorded yet"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "Start tracking payments by recording your first payment"}
      </p>
      {!hasFilters && (
        <Link
          href="/payments/new"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Record First Payment
        </Link>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}
