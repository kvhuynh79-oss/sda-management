"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

type XeroBankAccount = {
  xeroAccountId: string;
  name: string;
  code: string;
  bankAccountNumber: string;
  bankAccountType: string;
  currencyCode: string;
};

export default function XeroSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const [syncingAccounts, setSyncingAccounts] = useState<Record<string, boolean>>({});
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [xeroBankAccounts, setXeroBankAccounts] = useState<XeroBankAccount[]>(
    []
  );
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);

  // Get Xero connection status
  const connection = useQuery(api.xero.getConnection);

  // Get our bank accounts
  const bankAccounts = useQuery(api.bankAccounts.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  // Mutations
  const updateSyncSettings = useMutation(api.xero.updateSyncSettings);
  const disconnectXero = useMutation(api.xero.disconnect);

  // Actions
  const fetchXeroBankAccounts = useAction(api.xero.fetchXeroBankAccounts);
  const syncBankTransactions = useAction(api.xero.syncBankTransactions);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setMessage({
        type: "success",
        text: "Successfully connected to Xero! You can now sync your bank transactions.",
      });
    } else if (error) {
      setMessage({ type: "error", text: decodeURIComponent(error) });
    }
  }, [searchParams]);

  const handleConnect = () => {
    // Redirect to Xero OAuth with userId
    if (user) {
      window.location.href = `/api/xero/connect?userId=${encodeURIComponent(user.id)}`;
    } else {
      window.location.href = "/api/xero/connect";
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    const confirmed = await confirmDialog({
      title: "Disconnect Xero",
      message: "Are you sure you want to disconnect from Xero? This will stop automatic bank feed syncing.",
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await disconnectXero({ connectionId: connection._id });
      setMessage({ type: "success", text: "Successfully disconnected from Xero" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to disconnect from Xero" });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleFetchXeroAccounts = async () => {
    setIsFetchingAccounts(true);
    try {
      const accounts = await fetchXeroBankAccounts({});
      setXeroBankAccounts(accounts);
      setMessage({
        type: "success",
        text: `Found ${accounts.length} bank account(s) in Xero`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `Failed to fetch Xero bank accounts: ${error}`,
      });
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleSyncTransactions = async (
    bankAccountId: Id<"bankAccounts">,
    xeroAccountId: string,
    accountName: string
  ) => {
    setSyncingAccounts((prev) => ({ ...prev, [bankAccountId]: true }));
    setMessage(null);
    try {
      const result = await syncBankTransactions({
        bankAccountId,
        xeroAccountId,
      });
      setMessage({
        type: "success",
        text: `${accountName}: Synced ${result.imported} new transactions (${result.skipped} already existed)`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `${accountName}: Failed to sync - ${error}`,
      });
    } finally {
      setSyncingAccounts((prev) => {
        const next = { ...prev };
        delete next[bankAccountId];
        return next;
      });
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!connection) return;

    try {
      await updateSyncSettings({
        connectionId: connection._id,
        autoSyncEnabled: enabled,
      });
      setMessage({
        type: "success",
        text: enabled ? "Auto-sync enabled" : "Auto-sync disabled",
      });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update sync settings" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isConnected = connection?.connectionStatus === "connected";

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="text-teal-500 hover:text-teal-400 text-sm"
          >
            &larr; Back to Settings
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Xero Integration</h1>
          <p className="text-gray-400 mt-1">
            Connect to Xero to automatically sync bank transactions
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-900/30 border border-green-800 text-green-300"
                : "bg-red-900/30 border border-red-800 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Connection Status
          </h3>

          {connection === undefined ? (
            <div className="text-gray-400">Loading...</div>
          ) : !connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-400">Not connected</span>
              </div>
              <p className="text-gray-400 text-sm">
                Connect your Xero account to automatically sync bank
                transactions for reconciliation.
              </p>
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
              >
                Connect to Xero
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected
                        ? "bg-green-500"
                        : connection.connectionStatus === "error"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-white">
                    {isConnected
                      ? "Connected"
                      : connection.connectionStatus === "error"
                        ? "Error"
                        : connection.connectionStatus === "token_expired"
                          ? "Token Expired"
                          : "Disconnected"}
                  </span>
                </div>
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                )}
              </div>

              {connection.tenantName && (
                <div className="text-sm">
                  <span className="text-gray-400">Organization:</span>{" "}
                  <span className="text-white">{connection.tenantName}</span>
                </div>
              )}

              {connection.lastSyncAt && (
                <div className="text-sm">
                  <span className="text-gray-400">Last sync:</span>{" "}
                  <span className="text-white">
                    {new Date(connection.lastSyncAt).toLocaleString()}
                  </span>
                </div>
              )}

              {connection.lastSyncError && (
                <div className="text-sm text-red-400">
                  Last error: {connection.lastSyncError}
                </div>
              )}

              {!isConnected && (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
                >
                  Reconnect to Xero
                </button>
              )}
            </div>
          )}
        </div>

        {/* Xero Bank Accounts */}
        {isConnected && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Xero Bank Accounts
              </h3>
              <button
                onClick={handleFetchXeroAccounts}
                disabled={isFetchingAccounts}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                {isFetchingAccounts ? "Fetching..." : "Fetch Accounts"}
              </button>
            </div>

            {xeroBankAccounts.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Click &quot;Fetch Accounts&quot; to load bank accounts from Xero
              </p>
            ) : (
              <div className="space-y-3">
                {xeroBankAccounts.map((account) => (
                  <div
                    key={account.xeroAccountId}
                    className="p-4 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{account.name}</h4>
                        <p className="text-gray-400 text-sm">
                          {account.bankAccountNumber || "No account number"} |{" "}
                          {account.bankAccountType}
                        </p>
                      </div>
                      <div className="text-sm text-gray-400">
                        Code: {account.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Our Bank Accounts - Sync Actions */}
        {isConnected && bankAccounts && bankAccounts.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Sync Bank Transactions
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Select a bank account and its corresponding Xero account to sync
              transactions.
            </p>

            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account._id}
                  className="p-4 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">
                        {account.accountName}
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {account.bankName} | BSB: {account.bsb} | Acc:{" "}
                        {account.accountNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        account.accountType === "operating"
                          ? "bg-teal-950/50 text-teal-400"
                          : "bg-purple-900/50 text-purple-300"
                      }`}
                    >
                      {account.accountType}
                    </span>
                  </div>

                  {xeroBankAccounts.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <select
                        data-account-id={account._id}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-teal-600 focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select Xero account...
                        </option>
                        {xeroBankAccounts.map((xa) => (
                          <option key={xa.xeroAccountId} value={xa.xeroAccountId}>
                            {xa.name} ({xa.bankAccountNumber})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const select = document.querySelector(
                            `select[data-account-id="${account._id}"]`
                          ) as HTMLSelectElement;
                          const xeroAccountId = select?.value;
                          if (xeroAccountId && xeroAccountId !== "") {
                            handleSyncTransactions(account._id, xeroAccountId, account.accountName);
                          } else {
                            alertDialog("Please select a Xero account first");
                          }
                        }}
                        disabled={syncingAccounts[account._id]}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                      >
                        {syncingAccounts[account._id] ? "Syncing..." : "Sync Now"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Fetch Xero accounts first to enable syncing
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-Sync Settings */}
        {isConnected && connection && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Auto-Sync Settings
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex-1">
                <h4 className="text-white font-medium">Enable Auto-Sync</h4>
                <p className="text-gray-400 text-sm mt-1">
                  Automatically sync bank transactions daily
                </p>
              </div>
              <button
                onClick={() =>
                  handleToggleAutoSync(!connection.autoSyncEnabled)
                }
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  connection.autoSyncEnabled ? "bg-teal-700" : "bg-gray-600"
                } cursor-pointer`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    connection.autoSyncEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-teal-950/20 border border-teal-900 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-teal-400 mb-2">
            Setup Requirements
          </h3>
          <p className="text-teal-200 text-sm mb-3">
            To enable Xero integration, you need to configure the following
            environment variables:
          </p>
          <ul className="text-teal-200 text-sm space-y-2 list-disc list-inside">
            <li>
              <code className="bg-teal-950 px-2 py-0.5 rounded">
                XERO_CLIENT_ID
              </code>{" "}
              - Your Xero app client ID
            </li>
            <li>
              <code className="bg-teal-950 px-2 py-0.5 rounded">
                XERO_CLIENT_SECRET
              </code>{" "}
              - Your Xero app client secret
            </li>
            <li>
              <code className="bg-teal-950 px-2 py-0.5 rounded">
                XERO_REDIRECT_URI
              </code>{" "}
              - OAuth callback URL (e.g.,
              https://yourapp.com/api/xero/callback)
            </li>
          </ul>
          <p className="text-teal-400 text-xs mt-3">
            Create a Xero app at{" "}
            <a
              href="https://developer.xero.com/app/manage"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-teal-200"
            >
              developer.xero.com
            </a>
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Link
            href="/financials/reconciliation"
            className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors font-medium"
          >
            Go to Reconciliation
          </Link>
          <Link
            href="/financials/bank-accounts"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Manage Bank Accounts
          </Link>
        </div>
      </main>
    </div>
    </RequireAuth>
  );
}
