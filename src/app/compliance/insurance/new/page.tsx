"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "../../../../components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import Link from "next/link";

// Guidance for NDIS SDA providers on required insurance
const INSURANCE_GUIDANCE = {
  public_liability: {
    name: "Public Liability Insurance",
    description: "Covers claims for personal injury or property damage to third parties. NDIS Commission requires minimum $20 million coverage for registered providers.",
    minimumCoverage: 20000000,
    required: true,
  },
  professional_indemnity: {
    name: "Professional Indemnity Insurance",
    description: "Covers claims arising from professional advice or services provided. Protects against negligence claims related to SDA services.",
    minimumCoverage: 0,
    required: true,
  },
  building: {
    name: "Building Insurance",
    description: "Covers the physical structure of SDA properties against damage from fire, storm, flood, etc. Essential for property owners.",
    minimumCoverage: 0,
    required: true,
  },
  contents: {
    name: "Contents Insurance",
    description: "Covers contents and fixtures within SDA properties. Important for shared/common areas and provider-owned items.",
    minimumCoverage: 0,
    required: false,
  },
  workers_compensation: {
    name: "Workers Compensation Insurance",
    description: "Mandatory insurance covering employees for work-related injuries. Required if you have employees in NSW/VIC/QLD etc.",
    minimumCoverage: 0,
    required: true,
  },
  cyber: {
    name: "Cyber Liability Insurance",
    description: "Covers data breaches and cyber attacks. Important as you hold sensitive participant information.",
    minimumCoverage: 0,
    required: false,
  },
  directors_officers: {
    name: "Directors & Officers Insurance",
    description: "Protects company directors and officers from personal liability for decisions made in their capacity.",
    minimumCoverage: 0,
    required: false,
  },
  other: {
    name: "Other Insurance",
    description: "Other insurance policies such as motor vehicle, equipment, etc.",
    minimumCoverage: 0,
    required: false,
  },
};

export default function NewInsurancePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showGuidance, setShowGuidance] = useState(true);

  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const createPolicy = useMutation(api.insurancePolicies.create);

  const [formData, setFormData] = useState({
    insuranceType: "" as
      | "public_liability"
      | "professional_indemnity"
      | "building"
      | "contents"
      | "workers_compensation"
      | "cyber"
      | "directors_officers"
      | "other"
      | "",
    policyName: "",
    insurer: "",
    policyNumber: "",
    coverageAmount: "",
    excessAmount: "",
    isOrganizationWide: true,
    propertyId: "",
    startDate: "",
    endDate: "",
    renewalDate: "",
    annualPremium: "",
    paymentFrequency: "" as "annual" | "monthly" | "quarterly" | "",
    notes: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.insuranceType) return;

    setIsSaving(true);
    setError("");

    try {
      await createPolicy({
        insuranceType: formData.insuranceType,
        policyName: formData.policyName || INSURANCE_GUIDANCE[formData.insuranceType]?.name || formData.insuranceType,
        insurer: formData.insurer,
        policyNumber: formData.policyNumber,
        coverageAmount: parseFloat(formData.coverageAmount) || 0,
        excessAmount: formData.excessAmount ? parseFloat(formData.excessAmount) : undefined,
        isOrganizationWide: formData.isOrganizationWide,
        propertyId: !formData.isOrganizationWide && formData.propertyId ? formData.propertyId as Id<"properties"> : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        renewalDate: formData.renewalDate || undefined,
        annualPremium: formData.annualPremium ? parseFloat(formData.annualPremium) : undefined,
        paymentFrequency: formData.paymentFrequency || undefined,
        notes: formData.notes || undefined,
        createdBy: user.id as Id<"users">,
      });

      router.push("/compliance");
    } catch (err: any) {
      setError(err.message || "Failed to create insurance policy");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-fill policy name when type changes
  const handleTypeChange = (type: string) => {
    const guidance = INSURANCE_GUIDANCE[type as keyof typeof INSURANCE_GUIDANCE];
    setFormData({
      ...formData,
      insuranceType: type as any,
      policyName: guidance?.name || "",
    });
  };

  const selectedGuidance = formData.insuranceType
    ? INSURANCE_GUIDANCE[formData.insuranceType as keyof typeof INSURANCE_GUIDANCE]
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/compliance" className="text-teal-500 hover:text-teal-400 text-sm mb-2 block">
              &larr; Back to Compliance
            </Link>
            <h1 className="text-2xl font-bold text-white">Add Insurance Policy</h1>
            <p className="text-gray-400 mt-1">Record insurance coverage for your organisation or properties</p>
          </div>
        </div>

        {/* Guidance Panel */}
        {showGuidance && (
          <div className="bg-teal-950/30 border border-teal-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-teal-200 font-semibold mb-2">Required Insurance for NDIS SDA Providers</h3>
                <ul className="text-teal-400 text-sm space-y-1">
                  <li><span className="text-red-400">*</span> Public Liability - <strong>Minimum $20 million</strong> (NDIS requirement)</li>
                  <li><span className="text-red-400">*</span> Professional Indemnity - Recommended for all providers</li>
                  <li><span className="text-red-400">*</span> Building Insurance - For all SDA properties</li>
                  <li><span className="text-red-400">*</span> Workers Compensation - If you have employees</li>
                  <li>Contents Insurance - Recommended for shared areas</li>
                  <li>Cyber Liability - Recommended (holds participant data)</li>
                </ul>
              </div>
              <button
                onClick={() => setShowGuidance(false)}
                className="text-teal-500 hover:text-teal-400"
              >
                Hide
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Insurance Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Insurance Type *
            </label>
            <select
              required
              value={formData.insuranceType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Select insurance type...</option>
              <optgroup label="Required Coverage">
                <option value="public_liability">Public Liability ($20M minimum)</option>
                <option value="professional_indemnity">Professional Indemnity</option>
                <option value="workers_compensation">Workers Compensation</option>
              </optgroup>
              <optgroup label="Property Coverage">
                <option value="building">Building Insurance</option>
                <option value="contents">Contents Insurance</option>
              </optgroup>
              <optgroup label="Additional Coverage">
                <option value="cyber">Cyber Liability</option>
                <option value="directors_officers">Directors & Officers</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
          </div>

          {/* Type-specific guidance */}
          {selectedGuidance && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
              <p className="text-gray-300 text-sm">{selectedGuidance.description}</p>
              {selectedGuidance.minimumCoverage > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-600 rounded">
                  <p className="text-yellow-300 text-sm">
                    <strong>Minimum Required:</strong> {formatCurrency(selectedGuidance.minimumCoverage)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Policy Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Policy Name *
            </label>
            <input
              type="text"
              required
              value={formData.policyName}
              onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
              placeholder="e.g., Public Liability 2024-2025"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Insurer & Policy Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Insurer *
              </label>
              <input
                type="text"
                required
                value={formData.insurer}
                onChange={(e) => setFormData({ ...formData, insurer: e.target.value })}
                placeholder="e.g., QBE, Allianz, CGU"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Policy Number *
              </label>
              <input
                type="text"
                required
                value={formData.policyNumber}
                onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                placeholder="e.g., POL-2024-12345"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Coverage & Excess */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Coverage Amount * ($)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.coverageAmount}
                onChange={(e) => setFormData({ ...formData, coverageAmount: e.target.value })}
                placeholder="e.g., 20000000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              {selectedGuidance?.minimumCoverage && parseFloat(formData.coverageAmount) < selectedGuidance.minimumCoverage && (
                <p className="text-red-400 text-xs mt-1">
                  Warning: Below minimum required coverage of {formatCurrency(selectedGuidance.minimumCoverage)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Excess Amount ($)
              </label>
              <input
                type="number"
                min="0"
                value={formData.excessAmount}
                onChange={(e) => setFormData({ ...formData, excessAmount: e.target.value })}
                placeholder="e.g., 1000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Scope
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.isOrganizationWide}
                  onChange={() => setFormData({ ...formData, isOrganizationWide: true, propertyId: "" })}
                  className="text-teal-700"
                />
                <span className="text-white">Organisation-wide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isOrganizationWide}
                  onChange={() => setFormData({ ...formData, isOrganizationWide: false })}
                  className="text-teal-700"
                />
                <span className="text-white">Specific Property</span>
              </label>
            </div>
          </div>

          {/* Property Selection (if not org-wide) */}
          {!formData.isOrganizationWide && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Property
              </label>
              <select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select property...</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName} - {p.addressLine1}, {p.suburb}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Renewal Date
              </label>
              <input
                type="date"
                value={formData.renewalDate}
                onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Premium & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Annual Premium ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.annualPremium}
                onChange={(e) => setFormData({ ...formData, annualPremium: e.target.value })}
                placeholder="e.g., 5000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Payment Frequency
              </label>
              <select
                value={formData.paymentFrequency}
                onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select frequency...</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about this policy..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/compliance"
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || !formData.insuranceType}
              className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg"
            >
              {isSaving ? "Saving..." : "Add Insurance Policy"}
            </button>
          </div>
        </form>
      </main>
    </div>
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
