"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Id } from "../../../../convex/_generated/dataModel";

type BankAccountWithStats = {
  _id: Id<"bankAccounts">;
  accountName: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountType: "operating" | "trust";
  isActive: boolean;
  lastReconciledDate?: string;
  lastReconciledBalance?: number;
  createdAt: number;
  updatedAt: number;
  transactionCount: number;
  unmatchedCount: number;
  currentBalance: number;
  latestTransactionDate?: string;
};

export default function BankAccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountWithStats | null>(null);

  const accounts = useQuery(api.bankAccounts.getAll);
  const createAccount = useMutation(api.bankAccounts.create);
  const updateAccount = useMutation(api.bankAccounts.update);
  const removeAccount = useMutation(api.bankAccounts.remove);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  if (!user) {
    return <LoadingScreen />;
  }

  const handleDelete = async (accountId: Id<"bankAccounts">) => {
    if (!confirm("Are you sure you want to delete this bank account? This will also delete all associated transactions.")) {
      return;
    }
    try {
      await removeAccount({ id: accountId, userId: user.id as Id<"users"> });
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Failed to delete account. It may have associated transactions.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="financials" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4">
          <ol className="flex items-center gap-2 text-sm text-gray-400">
            <li>
              <Link href="/financials" className="hover:text-white">
                Financials
              </Link>
            </li>
            <li>/</li>
            <li className="text-white">Bank Accounts</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Bank Accounts</h2>
            <p className="text-gray-400 mt-1">Manage your bank accounts for reconciliation</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/financials/reconciliation"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go to Reconciliation
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + Add Bank Account
            </button>
          </div>
        </div>

        {/* Account Cards */}
        {accounts === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((account) => (
              <AccountCard
                key={account._id}
                account={account}
                onEdit={() => setEditingAccount(account)}
                onDelete={() => handleDelete(account._id)}
              />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {accounts && accounts.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Total Accounts"
              value={accounts.length.toString()}
              color="blue"
            />
            <StatCard
              label="Total Transactions"
              value={accounts.reduce((sum: number, a) => sum + a.transactionCount, 0).toString()}
              color="green"
            />
            <StatCard
              label="Unmatched Transactions"
              value={accounts.reduce((sum: number, a) => sum + a.unmatchedCount, 0).toString()}
              color={accounts.reduce((sum: number, a) => sum + a.unmatchedCount, 0) > 0 ? "yellow" : "green"}
            />
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || editingAccount) && (
        <AccountModal
          account={editingAccount}
          userId={user.id as Id<"users">}
          onClose={() => {
            setShowAddModal(false);
            setEditingAccount(null);
          }}
          onCreate={createAccount}
          onUpdate={updateAccount}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: BankAccountWithStats;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { transactionCount, unmatchedCount, currentBalance } = account;

  const getBankColor = (bankName: string) => {
    const colors: Record<string, string> = {
      ANZ: "bg-blue-600",
      Westpac: "bg-red-600",
      default: "bg-gray-600",
    };
    return colors[bankName] || colors.default;
  };

  const getAccountTypeLabel = (type: string) => {
    return type === "operating" ? "Operating Account" : "Trust Account";
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-white text-xs font-semibold rounded-full ${getBankColor(account.bankName)}`}>
            {account.bankName}
          </span>
          <span className={`px-2 py-1 text-xs rounded ${account.isActive ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400"}`}>
            {account.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Edit account"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
            title="Delete account"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">{account.accountName}</h3>
      <p className="text-gray-400 text-sm mb-4">{getAccountTypeLabel(account.accountType)}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-xs">BSB</p>
          <p className="text-white font-mono">{account.bsb}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Account Number</p>
          <p className="text-white font-mono">{account.accountNumber}</p>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-gray-400 text-xs">Transactions</p>
          <p className="text-white font-semibold">{transactionCount}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Unmatched</p>
          <p className={`font-semibold ${unmatchedCount > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {unmatchedCount}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Balance</p>
          <p className="text-white font-semibold">{formatCurrency(currentBalance)}</p>
        </div>
      </div>

      {account.lastReconciledDate && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs">Last Reconciled</p>
          <p className="text-gray-300 text-sm">
            {account.lastReconciledDate} - {formatCurrency(account.lastReconciledBalance ?? null)}
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/financials/reconciliation?account=${account._id}`}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm text-center rounded transition-colors"
        >
          Reconcile
        </Link>
        <Link
          href={`/financials/reconciliation?account=${account._id}&import=true`}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm text-center rounded transition-colors"
        >
          Import CSV
        </Link>
      </div>
    </div>
  );
}

function AccountModal({
  account,
  userId,
  onClose,
  onCreate,
  onUpdate,
}: {
  account: BankAccountWithStats | null;
  userId: Id<"users">;
  onClose: () => void;
  onCreate: (args: {
    userId: Id<"users">;
    accountName: string;
    bankName: string;
    bsb: string;
    accountNumber: string;
    accountType: "operating" | "trust";
  }) => Promise<Id<"bankAccounts">>;
  onUpdate: (args: {
    userId: Id<"users">;
    id: Id<"bankAccounts">;
    accountName?: string;
    bankName?: string;
    bsb?: string;
    accountNumber?: string;
    accountType?: "operating" | "trust";
    isActive?: boolean;
  }) => Promise<Id<"bankAccounts">>;
}) {
  const [formData, setFormData] = useState({
    accountName: account?.accountName ?? "",
    bankName: account?.bankName ?? "ANZ",
    bsb: account?.bsb ?? "",
    accountNumber: account?.accountNumber ?? "",
    accountType: account?.accountType ?? ("operating" as "operating" | "trust"),
    isActive: account?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (account) {
        await onUpdate({
          userId,
          id: account._id,
          ...formData,
        });
      } else {
        await onCreate({
          userId,
          accountName: formData.accountName,
          bankName: formData.bankName,
          bsb: formData.bsb,
          accountNumber: formData.accountNumber,
          accountType: formData.accountType,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save account:", err);
      alert("Failed to save account. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">
            {account ? "Edit Bank Account" : "Add Bank Account"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="e.g., Operating Account"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bank
            </label>
            <select
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ANZ">ANZ</option>
              <option value="Westpac">Westpac</option>
              <option value="Commonwealth Bank">Commonwealth Bank</option>
              <option value="NAB">NAB</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                BSB
              </label>
              <input
                type="text"
                value={formData.bsb}
                onChange={(e) => setFormData({ ...formData, bsb: e.target.value })}
                placeholder="000-000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="12345678"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Account Type
            </label>
            <select
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value as "operating" | "trust" })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="operating">Operating Account</option>
              <option value="trust">Trust Account</option>
            </select>
          </div>

          {account && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-300">
                Account is active
              </label>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {saving ? "Saving..." : account ? "Update Account" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
      <div className="text-gray-400 text-6xl mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Bank Accounts</h3>
      <p className="text-gray-400 mb-6">
        Add your bank accounts to start importing transactions for reconciliation.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        + Add Your First Account
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
