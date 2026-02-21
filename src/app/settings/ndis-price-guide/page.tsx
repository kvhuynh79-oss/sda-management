"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState } from "@/components/ui";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

const CATEGORY_LABELS: Record<string, string> = {
  high_physical_support: "High Physical Support",
  fully_accessible: "Fully Accessible",
  robust: "Robust",
  improved_liveability: "Improved Liveability",
};

export default function NdisPriceGuidePage() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [seedingRates, setSeedingRates] = useState(false);

  const userId = user ? (user.id as Id<"users">) : undefined;
  const rates = useQuery(api.ndisPriceGuide.getAll, userId ? { userId } : "skip");
  const seedRates = useMutation(api.ndisPriceGuide.seedRates);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const filtered = useMemo(() => {
    if (!rates) return [];
    return rates.filter((r) => {
      if (filterCategory !== "all" && r.sdaCategory !== filterCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.supportItemName.toLowerCase().includes(term) ||
          r.supportItemNumber.toLowerCase().includes(term) ||
          r.registrationGroup.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rates, filterCategory, searchTerm]);

  const handleSeedRates = async () => {
    if (!user) return;
    setSeedingRates(true);
    try {
      await seedRates({ userId: user.id as Id<"users"> });
    } catch {
      // Error handled by UI
    } finally {
      setSeedingRates(false);
    }
  };

  if (!user) return null;

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="settings" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">NDIS Price Guide</h1>
              <p className="mt-1 text-gray-400">
                Current SDA and support item rates from the NDIS Price Guide
              </p>
            </div>
            {rates && rates.length === 0 && (
              <button
                onClick={handleSeedRates}
                disabled={seedingRates}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {seedingRates ? "Seeding..." : "Seed Current Rates"}
              </button>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm">
              These rates are used to validate SDA claims and populate payment amounts. Rates are updated annually by the NDIS when the price guide is revised. Admin users can update rates manually when new price guides are published.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search by name or item number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Filter by SDA category"
            >
              <option value="all">All Categories</option>
              <option value="high_physical_support">High Physical Support</option>
              <option value="fully_accessible">Fully Accessible</option>
              <option value="robust">Robust</option>
              <option value="improved_liveability">Improved Liveability</option>
            </select>
          </div>

          {/* Table */}
          {!rates ? (
            <LoadingScreen />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No price guide entries"
              description={rates.length === 0 ? "Click 'Seed Current Rates' to load the current SDA price guide." : "No rates match your search criteria."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Item Number</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">SDA Category</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Build Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Unit</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">National Rate</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">NSW</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">VIC</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">QLD</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Effective From</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rate) => (
                    <tr key={rate._id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-teal-400 font-mono text-xs">{rate.supportItemNumber}</td>
                      <td className="py-3 px-4 text-white">{rate.supportItemName}</td>
                      <td className="py-3 px-4 text-gray-300">{rate.sdaCategory ? CATEGORY_LABELS[rate.sdaCategory] || rate.sdaCategory : "—"}</td>
                      <td className="py-3 px-4 text-gray-300 capitalize">{rate.sdaBuildingType?.replace("_", " ") || "—"}</td>
                      <td className="py-3 px-4 text-gray-400">{rate.unitOfMeasure}</td>
                      <td className="py-3 px-4 text-white text-right font-medium">{formatCents(rate.priceNational)}</td>
                      <td className="py-3 px-4 text-gray-300 text-right">{formatCents(rate.priceNSW)}</td>
                      <td className="py-3 px-4 text-gray-300 text-right">{formatCents(rate.priceVIC)}</td>
                      <td className="py-3 px-4 text-gray-300 text-right">{formatCents(rate.priceQLD)}</td>
                      <td className="py-3 px-4 text-gray-400">{rate.effectiveFrom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}
