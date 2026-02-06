"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";

// Create a function reference for the seed mutation
const seedAnneMarieMutation = makeFunctionReference<"mutation">("seedAnneMarie:seedAnneMarie");

export default function SeedPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <SeedPageContent />
    </RequireAuth>
  );
}

function SeedPageContent() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seedAnneMarie = useMutation(seedAnneMarieMutation);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const response = await seedAnneMarie({});
      setResult(JSON.stringify(response, null, 2));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setResult(`Error: ${errorMessage}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header currentPage="settings" />
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/settings" className="text-blue-400 hover:underline">
            ← Back to Settings
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-6">Data Seed Functions</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Anne-Marie Zammit</h2>
          <p className="text-gray-400 mb-4">
            This will create:
          </p>
          <ul className="list-disc list-inside text-gray-400 mb-4 space-y-1">
            <li>Property: 44 Waldron Road, Sefton NSW 2162</li>
            <li>Dwelling: Main House (High Physical Support, 4 residents with OOA)</li>
            <li>Participant: Anne-Marie Zammit (NDIS: 430121488, DOB: 4/3/1969)</li>
            <li>Move-in: 22 April 2025</li>
            <li>NDIS Plan: $58,818/year, 1/5/2025 - 8/4/2026, claim on 1st</li>
            <li>RRC: $419.68 fortnightly ($262.48 DSP + $157.20 CRA)</li>
            <li>Representative: Rosemary Kable (0404 239 884)</li>
          </ul>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-medium"
          >
            {loading ? "Running..." : "Run Seed"}
          </button>
        </div>

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Result:</h3>
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              {result}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
