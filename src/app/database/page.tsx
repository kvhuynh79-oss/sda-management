"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";

// Import the content from support coordinators and contractors pages
import SupportCoordinatorsContent from "./support-coordinators/SupportCoordinatorsContent";
import ContractorsContent from "./ContractorsContent";
import SILProvidersContent from "./sil-providers/SILProvidersContent";
import OccupationalTherapistsContent from "./occupational-therapists/OccupationalTherapistsContent";

type TabType = "support-coordinators" | "contractors" | "sil-providers" | "occupational-therapists";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

export default function DatabasePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DatabaseContent />
    </Suspense>
  );
}

function DatabaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "support-coordinators";

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser({
      id: parsed.id || parsed._id,
      role: parsed.role,
    });
  }, [router]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/database?tab=${tab}`, { scroll: false });
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Database</h2>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Manage external contacts and service providers
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleTabChange("support-coordinators")}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "support-coordinators"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Support Coordinators
            </button>
            <button
              onClick={() => handleTabChange("sil-providers")}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "sil-providers"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              SIL Providers
            </button>
            <button
              onClick={() => handleTabChange("occupational-therapists")}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "occupational-therapists"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Occupational Therapists
            </button>
            <button
              onClick={() => handleTabChange("contractors")}
              className={`pb-3 px-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "contractors"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Contractors
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "support-coordinators" && <SupportCoordinatorsContent />}
        {activeTab === "sil-providers" && <SILProvidersContent />}
        {activeTab === "occupational-therapists" && <OccupationalTherapistsContent />}
        {activeTab === "contractors" && <ContractorsContent />}
      </main>
    </div>
  );
}
