"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function OwnerDistributionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const distributions = useQuery(api.ownerDistributions.calculateDistributions, {
    month: selectedMonth,
  });

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  };

  const getOwnerName = (owner: any) => {
    if (owner.ownerType === "company" || owner.ownerType === "trust") {
      return owner.companyName || "Unknown Company";
    }
    return `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/payments" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            &larr; Back to Payments
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Owner Distributions</h2>
              <p className="text-gray-400 mt-1">
                Monthly payment calculations for property owners
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-gray-300">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Company Summary */}
        {distributions && (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 mb-8 border border-blue-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">
              Company Summary - {formatMonth(selectedMonth)}
            </h3>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total SDA Income</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(distributions.companyTotals.totalSda)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total RRC Income</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(distributions.companyTotals.totalRrc)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Income</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(distributions.companyTotals.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Management Fees</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(distributions.companyTotals.totalManagementFee)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Owner Payments</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(distributions.companyTotals.totalOwnerPayment)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Owner Distributions */}
        {distributions?.distributions.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No active participants with plans found.</p>
          </div>
        )}

        {distributions?.distributions.map((ownerDist) => (
          <div key={ownerDist.owner._id} className="bg-gray-800 rounded-lg p-6 mb-6">
            {/* Owner Header */}
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-700">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {getOwnerName(ownerDist.owner)}
                </h3>
                <p className="text-gray-400 text-sm">{ownerDist.owner.email}</p>
                {ownerDist.owner.ownerType !== "self" && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                    {ownerDist.owner.ownerType.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Total Payment Due</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(ownerDist.grandTotalOwnerPayment)}
                </p>
              </div>
            </div>

            {/* Properties */}
            {ownerDist.properties.map((propDist) => (
              <div key={propDist.property._id} className="mb-4 last:mb-0">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">
                    {propDist.property.propertyName || propDist.property.addressLine1}, {propDist.property.suburb}
                  </h4>

                  {/* Participants Table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-600">
                        <th className="text-left py-2">Participant</th>
                        <th className="text-right py-2">Monthly SDA</th>
                        <th className="text-right py-2">Monthly RRC</th>
                        <th className="text-right py-2">Total</th>
                        <th className="text-right py-2">Mgmt %</th>
                        <th className="text-right py-2">Mgmt Fee</th>
                        <th className="text-right py-2">Owner Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propDist.participants.map((p) => (
                        <tr key={p.participant._id} className="border-b border-gray-600/50">
                          <td className="py-2 text-white">
                            {p.participant.firstName} {p.participant.lastName}
                            <span className="text-gray-400 text-xs ml-2">
                              ({p.dwelling?.dwellingName || "Unknown"})
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-300">
                            {formatCurrency(p.monthlySda)}
                          </td>
                          <td className="py-2 text-right text-gray-300">
                            {formatCurrency(p.monthlyRrc)}
                          </td>
                          <td className="py-2 text-right text-blue-400">
                            {formatCurrency(p.totalIncome)}
                          </td>
                          <td className="py-2 text-right text-gray-400">
                            {p.managementFeePercent}%
                          </td>
                          <td className="py-2 text-right text-green-400">
                            {formatCurrency(p.managementFee)}
                          </td>
                          <td className="py-2 text-right text-yellow-400 font-medium">
                            {formatCurrency(p.ownerPayment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-600/30 font-medium">
                        <td className="py-2 text-white">Property Total</td>
                        <td className="py-2 text-right text-gray-300">
                          {formatCurrency(propDist.totalSda)}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {formatCurrency(propDist.totalRrc)}
                        </td>
                        <td className="py-2 text-right text-blue-400">
                          {formatCurrency(propDist.totalIncome)}
                        </td>
                        <td className="py-2 text-right text-gray-400">-</td>
                        <td className="py-2 text-right text-green-400">
                          {formatCurrency(propDist.totalManagementFee)}
                        </td>
                        <td className="py-2 text-right text-yellow-400 font-bold">
                          {formatCurrency(propDist.totalOwnerPayment)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}

            {/* Owner Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Total SDA</p>
                <p className="text-white font-medium">{formatCurrency(ownerDist.grandTotalSda)}</p>
              </div>
              <div>
                <p className="text-gray-400">Total RRC</p>
                <p className="text-white font-medium">{formatCurrency(ownerDist.grandTotalRrc)}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Income</p>
                <p className="text-blue-400 font-medium">{formatCurrency(ownerDist.grandTotalIncome)}</p>
              </div>
              <div>
                <p className="text-gray-400">Management Fees</p>
                <p className="text-green-400 font-medium">{formatCurrency(ownerDist.grandTotalManagementFee)}</p>
              </div>
              <div>
                <p className="text-gray-400">Owner Payment</p>
                <p className="text-yellow-400 font-bold">{formatCurrency(ownerDist.grandTotalOwnerPayment)}</p>
              </div>
            </div>
          </div>
        ))}
      </main>
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
