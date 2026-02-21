"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { ClaimsTab } from "./_components/ClaimsTab";
import { PaymentsTab } from "./_components/PaymentsTab";
import { OwnerPaymentsTab } from "./_components/OwnerPaymentsTab";
import { MtaClaimsTab } from "./_components/MtaClaimsTab";

type TabType = "payments" | "claims" | "owner_payments" | "mta_claims";

export default function FinancialsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingScreen />}>
        <FinancialsContent />
      </Suspense>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}

function FinancialsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "claims";

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/financials?tab=${tab}`, { scroll: false });
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="financials" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Financials</h2>
            <p className="text-gray-400 mt-1">Manage claims and payment records</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/financials/bank-accounts"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Bank Accounts
            </Link>
            <Link
              href="/financials/reconciliation"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Reconciliation
            </Link>
            {activeTab === "payments" && (
              <>
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
                  Distributions
                </Link>
                <Link
                  href="/payments/new"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  + Record Payment
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex gap-4">
            <TabButton
              label="Claims"
              isActive={activeTab === "claims"}
              onClick={() => handleTabChange("claims")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            />
            <TabButton
              label="Payment History"
              isActive={activeTab === "payments"}
              onClick={() => handleTabChange("payments")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <TabButton
              label="Owner Disbursements"
              isActive={activeTab === "owner_payments"}
              onClick={() => handleTabChange("owner_payments")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <TabButton
              label="MTA Claims"
              isActive={activeTab === "mta_claims"}
              onClick={() => handleTabChange("mta_claims")}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "claims" && <ClaimsTab userId={user.id} />}
        {activeTab === "payments" && <PaymentsTab userId={user.id} />}
        {activeTab === "owner_payments" && <OwnerPaymentsTab userId={user.id} />}
        {activeTab === "mta_claims" && <MtaClaimsTab userId={user.id} />}
      </main>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
        isActive
          ? "border-teal-600 text-teal-500"
          : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
