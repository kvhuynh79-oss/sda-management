"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";

export default function NewEmergencyPlanPage() {
  const router = useRouter();
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-24">
            <h1 className="text-2xl font-bold text-white mb-2">New Emergency Plan</h1>
            <p className="text-gray-400 mb-6">This feature is coming soon.</p>
            <button
              onClick={() => router.push("/compliance/emergency-plans")}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Emergency Plans
            </button>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
