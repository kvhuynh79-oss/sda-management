"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { StatCard } from "./StatCard";

export function PaymentsTab({ userId }: { userId: string }) {
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const payments = useQuery(api.payments.getAll, { userId: userId as Id<"users"> });

  const filteredPayments = payments?.filter((payment) => {
    const matchesSource = filterSource === "all" || payment.paymentSource === filterSource;
    const matchesSearch =
      !searchTerm ||
      payment.participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.participant?.ndisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSource && matchesSearch;
  });

  const totalExpected = filteredPayments?.reduce((sum, p) => sum + p.expectedAmount, 0) || 0;
  const totalActual = filteredPayments?.reduce((sum, p) => sum + p.actualAmount, 0) || 0;
  const totalVariance = totalActual - totalExpected;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Expected" value={formatCurrency(totalExpected)} color="blue" />
        <StatCard label="Total Received" value={formatCurrency(totalActual)} color="green" />
        <StatCard label="Variance" value={formatCurrency(totalVariance)} color={totalVariance >= 0 ? "green" : "red"} />
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or NDIS number..."
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Sources</option>
            <option value="ndia">NDIA Managed</option>
            <option value="plan_manager">Plan Manager</option>
            <option value="self_managed">Self Managed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {!filteredPayments ? (
        <div className="text-gray-400 text-center py-8">Loading...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Participant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Received</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="hover:bg-gray-700">
                  <td className="px-4 py-3 text-white text-sm">{payment.paymentDate}</td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{payment.participant?.firstName} {payment.participant?.lastName}</p>
                    <p className="text-gray-400 text-xs">{payment.participant?.ndisNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{payment.paymentPeriodStart} - {payment.paymentPeriodEnd}</td>
                  <td className="px-4 py-3 text-right text-white text-sm">{formatCurrency(payment.expectedAmount)}</td>
                  <td className="px-4 py-3 text-right text-green-400 text-sm">{formatCurrency(payment.actualAmount)}</td>
                  <td className={`px-4 py-3 text-right text-sm ${payment.variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(payment.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
