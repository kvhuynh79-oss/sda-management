"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

interface ExportMetadata {
  exportedAt: string;
  exportedBy: string;
  organizationId: string;
  organizationName: string;
  format: string;
  totalRecords: number;
  tableCounts: Record<string, number>;
}

export default function DataExportPage() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportMetadata, setExportMetadata] = useState<ExportMetadata | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [fileSizeDisplay, setFileSizeDisplay] = useState<string | null>(null);

  const exportData = useAction(api.dataExport.exportOrganizationData);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportComplete(false);
    setExportError(null);
    setExportMetadata(null);
    setFileSizeDisplay(null);

    try {
      const result = await exportData({
        userId: user.id as Id<"users">,
      });

      if (!result.success || !result.data || !result.metadata) {
        setExportError(result.error || "Export failed. Please try again.");
        return;
      }

      // Build the full export object with metadata envelope
      const fullExport = {
        _exportMetadata: result.metadata,
        data: result.data,
      };

      // Convert to JSON and trigger download
      const jsonString = JSON.stringify(fullExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Generate filename with org name and timestamp
      const orgSlug = result.metadata.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `${orgSlug}-data-export-${dateStr}.json`;

      // Trigger browser download
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update UI state
      setExportMetadata(result.metadata);
      setFileSizeDisplay(formatBytes(blob.size));
      setExportComplete(true);
    } catch (error) {
      console.error("Export failed:", error);
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      setExportError(message);
      await alertDialog({
        title: "Export Failed",
        message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <RequireAuth allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="settings" />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/settings" className="hover:text-white transition-colors">
              Settings
            </Link>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-white">Data Export</span>
          </nav>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Data Export</h1>
            <p className="text-gray-400 mt-1">
              Export all your organization data for compliance, migration, or
              backup purposes
            </p>
          </div>

          {/* Export Card */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-teal-900/30 rounded-lg">
                <svg
                  className="w-6 h-6 text-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  Full Organization Export
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Downloads a single JSON file containing all records across all
                  tables for your organization. Encrypted fields (NDIS numbers,
                  dates of birth, bank account numbers) are included in
                  decrypted form. User passwords and MFA secrets are excluded.
                </p>

                {/* What's included */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Properties and dwellings
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Participants and NDIS plans
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Payments, claims, and finances
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Maintenance and inspections
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Incidents and complaints
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Communications and tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Contractors and stakeholders
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Compliance certifications
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Audit logs (last 10,000)
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-teal-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Staff, policies, and calendar
                  </div>
                </div>

                {/* Format info */}
                <div className="mt-4 flex items-center gap-3">
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-medium">
                    JSON
                  </span>
                  <span className="text-gray-400 text-sm">
                    Structured format suitable for data migration and compliance
                    audits
                  </span>
                </div>

                {/* Export button */}
                <div className="mt-6">
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Exporting data...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Export All Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error state */}
          {exportError && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-red-300 font-medium">Export Failed</h3>
                  <p className="text-red-400 text-sm mt-1">{exportError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success state */}
          {exportComplete && exportMetadata && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-green-300 font-medium">
                    Export Complete
                  </h3>
                  <p className="text-green-400 text-sm mt-1">
                    Your data has been downloaded successfully.
                  </p>

                  {/* Export summary */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">
                        Total Records
                      </p>
                      <p className="text-white text-xl font-semibold mt-1">
                        {exportMetadata.totalRecords.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">
                        File Size
                      </p>
                      <p className="text-white text-xl font-semibold mt-1">
                        {fileSizeDisplay}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase tracking-wide">
                        Tables Exported
                      </p>
                      <p className="text-white text-xl font-semibold mt-1">
                        {Object.keys(exportMetadata.tableCounts).length}
                      </p>
                    </div>
                  </div>

                  {/* Table breakdown */}
                  <details className="mt-4">
                    <summary className="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors">
                      View table breakdown
                    </summary>
                    <div className="mt-3 bg-gray-800/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {Object.entries(exportMetadata.tableCounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([table, count]) => (
                            <div
                              key={table}
                              className="flex items-center justify-between gap-2 py-1"
                            >
                              <span className="text-gray-400 truncate">
                                {table}
                              </span>
                              <span className="text-white font-mono text-xs flex-shrink-0">
                                {count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </details>

                  <p className="text-gray-400 text-xs mt-3">
                    Exported at{" "}
                    {new Date(exportMetadata.exportedAt).toLocaleString()} by{" "}
                    {exportMetadata.exportedBy}. This export has been logged to
                    the audit trail.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security notice */}
          <div className="bg-yellow-900/10 border border-yellow-900/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="text-yellow-400 font-medium text-sm">
                  Security Notice
                </h3>
                <ul className="text-yellow-400/80 text-sm mt-1 space-y-1 list-disc list-inside">
                  <li>
                    The exported file contains sensitive NDIS data including
                    participant details and financial records.
                  </li>
                  <li>
                    Store the export file securely and delete it when no longer
                    needed.
                  </li>
                  <li>
                    All data exports are recorded in the audit log for
                    compliance.
                  </li>
                  <li>
                    User passwords and MFA secrets are never included in
                    exports.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Back to settings */}
          <div className="flex gap-4">
            <Link
              href="/settings"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Back to Settings
            </Link>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
