"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

// API Key type (matches backend return shape from apiKeys.getByOrganization)
interface ApiKeyRecord {
  _id: Id<"apiKeys">;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: number;
  expiresAt?: number;
  createdBy: Id<"users">;
  createdAt: number;
}

// Available permission definitions
const PERMISSION_OPTIONS = [
  { value: "read:properties", label: "Read Properties", group: "Properties" },
  { value: "write:properties", label: "Write Properties", group: "Properties" },
  { value: "read:participants", label: "Read Participants", group: "Participants" },
  { value: "write:participants", label: "Write Participants", group: "Participants" },
  { value: "read:maintenance", label: "Read Maintenance", group: "Maintenance" },
  { value: "write:maintenance", label: "Write Maintenance", group: "Maintenance" },
  { value: "read:incidents", label: "Read Incidents", group: "Incidents" },
  { value: "write:incidents", label: "Write Incidents", group: "Incidents" },
  { value: "read:communications", label: "Read Communications", group: "Communications" },
  { value: "write:communications", label: "Write Communications", group: "Communications" },
] as const;

// API endpoint documentation
const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/properties", description: "List properties" },
  { method: "POST", path: "/api/v1/properties", description: "Create a property" },
  { method: "GET", path: "/api/v1/participants", description: "List participants" },
  { method: "GET", path: "/api/v1/maintenance", description: "List maintenance requests" },
  { method: "GET", path: "/api/v1/incidents", description: "List incidents" },
  { method: "GET", path: "/api/v1/communications", description: "List communications" },
  { method: "POST", path: "/api/v1/communications", description: "Create a communication" },
  { method: "GET", path: "/api/v1/communications/threads", description: "List threads" },
  { method: "GET", path: "/api/v1/lookup", description: "Lookup participants/properties" },
] as const;

export default function ApiKeysPage() {
  return (
    <RequireAuth allowedRoles={["admin"]} loadingMessage="Loading API keys...">
      <ApiKeysContent />
    </RequireAuth>
  );
}

function ApiKeysContent() {
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyRevealModal, setShowKeyRevealModal] = useState(false);
  const [revealedKey, setRevealedKey] = useState("");
  const [copied, setCopied] = useState(false);

  // Create form state
  const [keyName, setKeyName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState(100);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Queries and mutations
  const apiKeysRaw = useQuery(
    api.apiKeys.getByOrganization,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const apiKeys = apiKeysRaw as ApiKeyRecord[] | undefined;

  const createKey = useMutation(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);

  // Separate active and revoked keys
  const { activeKeys, revokedKeys } = useMemo(() => {
    if (!apiKeys) return { activeKeys: [] as ApiKeyRecord[], revokedKeys: [] as ApiKeyRecord[] };
    return {
      activeKeys: apiKeys.filter((k: ApiKeyRecord) => k.isActive),
      revokedKeys: apiKeys.filter((k: ApiKeyRecord) => !k.isActive),
    };
  }, [apiKeys]);

  const handleTogglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!keyName.trim()) {
      setCreateError("Key name is required.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setCreateError("Select at least one permission.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const result = await createKey({
        userId: user.id as Id<"users">,
        name: keyName.trim(),
        permissions: selectedPermissions,
        rateLimit,
      });

      // Close create modal, show key reveal modal
      setShowCreateModal(false);
      setRevealedKey(result.fullKey);
      setShowKeyRevealModal(true);

      // Reset form
      setKeyName("");
      setSelectedPermissions([]);
      setRateLimit(100);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create API key."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: Id<"apiKeys">, keyDisplayName: string) => {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: "Revoke API Key",
      message: `Are you sure you want to revoke "${keyDisplayName}"? Any integrations using this key will immediately stop working. This action cannot be undone.`,
      confirmLabel: "Revoke Key",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await revokeKey({
        userId: user.id as Id<"users">,
        keyId,
      });
    } catch (error) {
      await alertDialog({
        title: "Error",
        message: "Failed to revoke API key. Please try again.",
      });
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = revealedKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseRevealModal = () => {
    setShowKeyRevealModal(false);
    setRevealedKey("");
    setCopied(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatLastUsed = (timestamp: number | undefined) => {
    if (!timestamp) return "Never";

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
    return formatDate(timestamp);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isLoading = apiKeys === undefined;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </Link>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">API Keys</h1>
            <p className="text-gray-400 mt-1">
              Manage API keys for integrating with external applications
            </p>
          </div>
          <button
            onClick={() => {
              setCreateError("");
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 whitespace-nowrap"
          >
            + Create API Key
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-5 bg-gray-700 rounded w-40" />
                  <div className="h-6 bg-gray-700 rounded w-16" />
                </div>
                <div className="h-4 bg-gray-700 rounded w-48 mb-2" />
                <div className="h-4 bg-gray-700 rounded w-64" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && apiKeys && apiKeys.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No API Keys</h3>
            <p className="text-gray-400 mb-4">
              Create an API key to start integrating with external applications.
            </p>
            <button
              onClick={() => {
                setCreateError("");
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              + Create Your First API Key
            </button>
          </div>
        )}

        {/* Active keys */}
        {!isLoading && activeKeys.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Active Keys ({activeKeys.length})
            </h2>
            {activeKeys.map((key: ApiKeyRecord) => (
              <div
                key={key._id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:bg-gray-700/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-medium truncate">{key.name}</h3>
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-green-900/50 text-green-400">
                        Active
                      </span>
                    </div>
                    <div className="font-mono text-sm text-gray-400 mb-2">
                      {key.keyPrefix}...
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {key.permissions.map((perm: string) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Rate limit: {key.rateLimit}/min</span>
                      <span>Last used: {formatLastUsed(key.lastUsedAt)}</span>
                      <span>Created: {formatDate(key.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(key._id, key.name)}
                    className="flex-shrink-0 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Revoked keys */}
        {!isLoading && revokedKeys.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Revoked Keys ({revokedKeys.length})
            </h2>
            {revokedKeys.map((key: ApiKeyRecord) => (
              <div
                key={key._id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 opacity-60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-medium truncate">{key.name}</h3>
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded bg-red-900/50 text-red-400">
                        Revoked
                      </span>
                    </div>
                    <div className="font-mono text-sm text-gray-400 mb-2">
                      {key.keyPrefix}...
                    </div>
                    <div className="text-xs text-gray-400">
                      Created: {formatDate(key.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Documentation */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">API Documentation</h2>

          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-300">Base URL</span>
              <div className="mt-1 px-3 py-2 bg-gray-900 rounded-lg font-mono text-sm text-teal-400">
                https://mysdamanager.com/api/v1
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-300">Authentication</span>
              <div className="mt-1 px-3 py-2 bg-gray-900 rounded-lg font-mono text-sm text-gray-300">
                Authorization: Bearer &lt;api_key&gt;
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-300 block mb-2">Endpoints</span>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full text-sm" role="table" aria-label="API Endpoints">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th scope="col" className="text-left px-4 py-2 text-gray-400 font-medium">Method</th>
                      <th scope="col" className="text-left px-4 py-2 text-gray-400 font-medium">Path</th>
                      <th scope="col" className="text-left px-4 py-2 text-gray-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {API_ENDPOINTS.map((endpoint, i) => (
                      <tr
                        key={i}
                        className={i < API_ENDPOINTS.length - 1 ? "border-b border-gray-800" : ""}
                      >
                        <td className="px-4 py-2">
                          <span
                            className={`font-mono text-xs font-medium px-1.5 py-0.5 rounded ${
                              endpoint.method === "GET"
                                ? "bg-green-900/40 text-green-400"
                                : "bg-blue-900/40 text-blue-400"
                            }`}
                          >
                            {endpoint.method}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-300 text-xs">
                          {endpoint.path}
                        </td>
                        <td className="px-4 py-2 text-gray-400">
                          {endpoint.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 p-4 bg-teal-950/20 border border-teal-900 rounded-lg">
              <p className="text-teal-300 text-sm">
                Full API documentation with request/response examples will be available at{" "}
                <span className="font-mono text-teal-400">https://mysdamanager.com/docs/api</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Outlook Add-in */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">Outlook Add-in</h2>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Push emails from Microsoft Outlook directly into MySDAManager Communications.
            The add-in reads the current email and pre-fills the communication form.
          </p>

          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-300 block mb-2">Setup Instructions</span>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                <li>Create an API key above with <span className="text-teal-400 font-mono text-xs">read:communications</span> and <span className="text-teal-400 font-mono text-xs">write:communications</span> permissions</li>
                <li>Download the add-in manifest file below</li>
                <li>In Outlook Web (outlook.office.com): open an email, click <strong className="text-gray-300">&quot;...&quot;</strong> &rarr; <strong className="text-gray-300">Get Add-ins</strong> &rarr; <strong className="text-gray-300">My add-ins</strong> &rarr; <strong className="text-gray-300">Add a custom add-in</strong> &rarr; <strong className="text-gray-300">Add from URL</strong></li>
                <li>Enter the manifest URL or upload the file</li>
                <li>Open any email and click <strong className="text-gray-300">&quot;Push to Comms&quot;</strong> in the ribbon</li>
                <li>Paste your API key on first use (saved automatically)</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/outlook-addin/manifest.xml"
                download="MySDAManager-Outlook-Manifest.xml"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Manifest (XML)
              </a>
              <a
                href="/outlook-addin/taskpane"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Taskpane in Browser
              </a>
            </div>

            <div className="p-3 bg-gray-900 rounded-lg">
              <span className="text-xs text-gray-400 block mb-1">Manifest URL (for &quot;Add from URL&quot;)</span>
              <code className="text-sm text-teal-400 font-mono break-all">
                https://mysdamanager.com/outlook-addin/manifest.xml
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-key-title"
          >
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 id="create-key-title" className="text-xl font-semibold text-white">
                Create API Key
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                  {createError}
                </div>
              )}

              {/* Key Name */}
              <div>
                <label htmlFor="key-name" className="block text-sm font-medium text-gray-300 mb-1">
                  Key Name
                </label>
                <input
                  id="key-name"
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Production Key"
                  autoFocus
                />
              </div>

              {/* Permissions */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-300 mb-2">
                  Permissions
                </legend>
                <p className="text-xs text-gray-400 mb-3">
                  Select what this key can access
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.value)}
                        onChange={() => handleTogglePermission(perm.value)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-300">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Rate Limit */}
              <div>
                <label htmlFor="rate-limit" className="block text-sm font-medium text-gray-300 mb-1">
                  Rate Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="rate-limit"
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    min={1}
                    max={10000}
                  />
                  <span className="text-sm text-gray-400">requests per minute</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                {isCreating ? "Creating..." : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Reveal Modal (shown once after creation) */}
      {showKeyRevealModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reveal-key-title"
          >
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 id="reveal-key-title" className="text-xl font-semibold text-white">
                API Key Created
              </h2>
              <button
                onClick={handleCloseRevealModal}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Warning banner */}
              <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg mb-5">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-yellow-300 text-sm">
                  Copy this key now. It will not be shown again.
                </p>
              </div>

              {/* Key display */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between gap-3">
                <code className="text-sm text-teal-400 font-mono break-all flex-1" aria-label="Your new API key">
                  {revealedKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="flex-shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label={copied ? "Copied to clipboard" : "Copy API key"}
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={handleCloseRevealModal}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
