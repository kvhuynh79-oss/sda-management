"use client";

import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LifeBuoy } from "lucide-react";

export default function BusinessContinuityPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <LifeBuoy className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Business Continuity</h1>
            <p className="text-gray-400 max-w-md">
              Organisation business continuity planning. This feature is coming soon.
            </p>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
