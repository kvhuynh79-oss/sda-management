"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NDISExportPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Provider settings form state
  const [settingsForm, setSettingsForm] = useState({
    providerName: "",
    ndisRegistrationNumber: "",
    abn: "",
    defaultGstCode: "P2",
    defaultSupportItemNumber: "",
    orgAbbreviation: "",
  });

  const userId = user ? (user.id as Id<"users">) : undefined;
  const providerSettings = useQuery(api.ndisClaimExport.getProviderSettings, userId ? { userId } : "skip");
  const participants = useQuery(api.ndisClaimExport.getActiveParticipantsForClaim, userId ? { userId } : "skip");
  const saveSettings = useMutation(api.ndisClaimExport.saveProviderSettings);

  const claimData = useQuery(
    api.ndisClaimExport.generateClaimData,
    periodStart && periodEnd && userId
      ? {
          userId,
          periodStart,
          periodEnd,
          participantIds:
            selectedParticipants.length > 0 && !selectAll
              ? (selectedParticipants as Id<"participants">[])
              : undefined,
        }
      : "skip"
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));

    // Set default period to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPeriodStart(formatDateForInput(firstDay));
    setPeriodEnd(formatDateForInput(lastDay));
  }, [router]);

  // Update settings form when data loads
  useEffect(() => {
    if (providerSettings) {
      setSettingsForm({
        providerName: providerSettings.providerName || "",
        ndisRegistrationNumber: providerSettings.ndisRegistrationNumber || "",
        abn: providerSettings.abn || "",
        defaultGstCode: providerSettings.defaultGstCode || "P2",
        defaultSupportItemNumber: providerSettings.defaultSupportItemNumber || "",
        orgAbbreviation: (providerSettings as any).orgAbbreviation || "",
      });
    }
  }, [providerSettings]);

  // Select all participants by default
  useEffect(() => {
    if (participants && selectAll) {
      setSelectedParticipants(participants.filter((p) => p.hasPlan).map((p) => p._id));
    }
  }, [participants, selectAll]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleToggleParticipant = (id: string) => {
    setSelectAll(false);
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
      setSelectAll(false);
    } else {
      setSelectedParticipants(participants?.filter((p) => p.hasPlan).map((p) => p._id) || []);
      setSelectAll(true);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!userId) return;
      await saveSettings({ userId, ...settingsForm });
      setShowSettings(false);
      await alertDialog("Provider settings saved successfully");
    } catch (err) {
      console.error("Failed to save settings:", err);
      await alertDialog("Failed to save settings. Please try again.");
    }
  };

  // Helper: sanitize ClaimReference — only alphanumeric, /, _, - allowed (up to 50 chars)
  const sanitizeClaimRef = (ref: string): string => {
    return String(ref || "").replace(/[^a-zA-Z0-9/_-]/g, "").substring(0, 50);
  };

  // Helper: validate GST code — must be P1, P2, or P5 per NDIS spec
  const validGstCode = (code: string | undefined): string => {
    if (code === "P1" || code === "P2" || code === "P5") return code;
    return "P2"; // Default to P2 (GST Free) for SDA
  };

  const exportToCSV = async () => {
    if (!claimData || !claimData.claims || claimData.claims.length === 0) {
      await alertDialog("No claim data to export");
      return;
    }

    // Check for encrypted NDIS numbers before exporting
    const encryptedClaims = claimData.claims.filter(
      (c: Record<string, unknown>) => {
        const ndis = c.NDISNumber as string;
        return !ndis || ndis.startsWith("enc:") || ndis === "[encrypted]";
      }
    );
    if (encryptedClaims.length > 0) {
      const names = encryptedClaims
        .map((c: Record<string, unknown>) => c._participantName)
        .join(", ");
      await alertDialog(
        `Cannot export: NDIS numbers could not be decrypted for: ${names}.\n\n` +
        `Please check that the ENCRYPTION_KEY environment variable is correctly set in your Convex dashboard (Settings > Environment Variables).`
      );
      return;
    }

    // CSV headers (exact NDIS format)
    const headers = [
      "RegistrationNumber",
      "NDISNumber",
      "SupportsDeliveredFrom",
      "SupportsDeliveredTo",
      "SupportNumber",
      "ClaimReference",
      "Quantity",
      "Hours",
      "UnitPrice",
      "GSTCode",
      "AuthorisedBy",
      "ParticipantApproved",
      "InKindFundingProgram",
      "ClaimType",
      "CancellationReason",
      "ABN of Support Provider",
    ];

    // Build CSV content
    let csvContent = headers.join(",") + "\n";

    // Validate that no SupportNumber is empty before proceeding
    const missingSupportClaims = claimData.claims.filter(
      (c: Record<string, unknown>) => !c.SupportNumber
    );
    if (missingSupportClaims.length > 0) {
      const names = missingSupportClaims
        .map((c: Record<string, unknown>) => c._participantName)
        .join(", ");
      await alertDialog(
        `Cannot export: Support Item Number is missing for: ${names}.\n\n` +
        `Please set a Support Item Number on their plan, or configure a default in Provider Settings.`
      );
      return;
    }

    claimData.claims.forEach((claim: Record<string, unknown>) => {
      const row = headers.map((header) => {
        let value = claim[header] ?? "";
        // Sanitize fields per NDIS spec
        if (header === "RegistrationNumber" && typeof value === "string") {
          value = value.replace(/\s/g, ""); // Strip spaces from registration number
        }
        if (header === "ABN of Support Provider" && typeof value === "string") {
          value = value.replace(/\s/g, ""); // Strip spaces from ABN
        }
        if (header === "GSTCode") {
          value = validGstCode(typeof value === "string" ? value : undefined);
        }
        if (header === "ClaimReference" && typeof value === "string") {
          value = sanitizeClaimRef(value); // Only alphanumeric + / _ -
        }
        // Dates are already YYYY-MM-DD from the server — do NOT convert
        // Escape values that contain commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(",") + "\n";
    });

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    // Filename format: {ORG}_{DDMMYYYY}.csv (e.g. BLS_15022026.csv)
    const now = new Date();
    const todayDDMMYYYY = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const orgCode = (providerSettings as any)?.orgAbbreviation || settingsForm.providerName?.substring(0, 3).toUpperCase() || "NDIS";
    link.setAttribute("download", `${orgCode}_${todayDDMMYYYY}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const needsSettings = !providerSettings;

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="payments" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/payments" className="text-teal-500 hover:text-teal-400 mb-4 inline-block">
            &larr; Back to Payments
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">NDIS Bulk Claim Export</h2>
              <p className="text-gray-400 mt-1">
                Generate CSV files for NDIS bulk payment requests
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Provider Settings
            </button>
          </div>
        </div>

        {/* Settings Warning */}
        {needsSettings && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">
              Please configure your provider settings before generating claims.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="mt-2 text-yellow-300 hover:text-yellow-200 underline"
            >
              Configure Settings
            </button>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-4">Provider Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.providerName}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, providerName: e.target.value })
                    }
                    placeholder="Better Living Solutions"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    NDIS Registration Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settingsForm.ndisRegistrationNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, ndisRegistrationNumber: e.target.value })
                    }
                    placeholder="4050052336"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    ABN <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settingsForm.abn}
                    onChange={(e) => setSettingsForm({ ...settingsForm, abn: e.target.value })}
                    placeholder="87630237277"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Default Support Item Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={settingsForm.defaultSupportItemNumber}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, defaultSupportItemNumber: e.target.value })
                    }
                    placeholder="06_431_0131_2_2"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    SDA support item code (e.g., 06_431_0131_2_2)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Default GST Code
                  </label>
                  <select
                    value={settingsForm.defaultGstCode}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, defaultGstCode: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="P2">P2 - GST Free</option>
                    <option value="P1">P1 - GST Applicable</option>
                    <option value="P5">P5 - Input Taxed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Organisation Abbreviation
                  </label>
                  <input
                    type="text"
                    value={settingsForm.orgAbbreviation}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, orgAbbreviation: e.target.value.toUpperCase() })
                    }
                    maxLength={10}
                    placeholder="BLS"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Used in CSV export filenames (e.g. BLS_15022026.csv)
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={
                    !settingsForm.ndisRegistrationNumber ||
                    !settingsForm.abn ||
                    !settingsForm.defaultSupportItemNumber
                  }
                  className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Period Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Claim Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Supports Delivered From
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Supports Delivered To
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Participant Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Select Participants</h3>
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              {selectAll ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {participants?.map((participant) => (
              <label
                key={participant._id}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  participant.hasPlan
                    ? "bg-gray-700 hover:bg-gray-650"
                    : "bg-gray-700/50 opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(participant._id)}
                  onChange={() => handleToggleParticipant(participant._id)}
                  disabled={!participant.hasPlan}
                  className="w-5 h-5 text-teal-700 bg-gray-600 border-gray-500 rounded"
                />
                <div className="ml-3 flex-1">
                  <span className="text-white">
                    {participant.firstName} {participant.lastName}
                  </span>
                  <span className="text-gray-400 ml-2 text-sm">({participant.ndisNumber})</span>
                </div>
                {participant.hasPlan ? (
                  <span className="text-green-400 text-sm">
                    ${(participant.monthlyAmount || 0).toFixed(2)}/month
                    {participant.claimDay && <span className="text-gray-400 ml-1">(day {participant.claimDay})</span>}
                  </span>
                ) : (
                  <span className="text-red-400 text-sm">No active plan</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        {claimData && claimData.claims && claimData.claims.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Claim Preview ({claimData.claims.length} claims)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-3 text-gray-400 text-sm">Participant</th>
                    <th className="py-2 px-3 text-gray-400 text-sm">NDIS Number</th>
                    <th className="py-2 px-3 text-gray-400 text-sm">Period</th>
                    <th className="py-2 px-3 text-gray-400 text-sm">Monthly Amount</th>
                    <th className="py-2 px-3 text-gray-400 text-sm">Claim Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {claimData.claims.map((claim: Record<string, unknown>, index: number) => (
                    <tr key={index} className="border-b border-gray-700/50">
                      <td className="py-2 px-3 text-white">{claim._participantName as string}</td>
                      <td className="py-2 px-3 text-gray-300">{claim.NDISNumber as string}</td>
                      <td className="py-2 px-3 text-gray-300 text-sm">
                        {claim.SupportsDeliveredFrom as string} to {claim.SupportsDeliveredTo as string}
                      </td>
                      <td className="py-2 px-3 text-green-400 font-medium">
                        ${claim.UnitPrice as string}
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-sm">
                        {claim.ClaimReference as string}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-700/50">
                    <td colSpan={3} className="py-3 px-3 text-white font-semibold">
                      Total
                    </td>
                    <td className="py-3 px-3 text-green-400 font-bold">
                      $
                      {claimData.claims
                        .reduce(
                          (sum: number, c: Record<string, unknown>) => sum + parseFloat(c.UnitPrice as string),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex gap-4">
          <button
            onClick={exportToCSV}
            disabled={!claimData || !claimData.claims || claimData.claims.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            Download NDIS CSV
          </button>
          <Link
            href="/payments"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
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
