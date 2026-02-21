"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../../convex/_generated/dataModel";

type CategoryType = "sda_income" | "rrc_income" | "owner_payment" | "maintenance" | "other_income" | "other_expense" | "transfer" | "uncategorized";

type BankAccount = {
  _id: Id<"bankAccounts">;
  accountName: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountType: "operating" | "trust";
  isActive: boolean;
};

export default function ReconciliationPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ReconciliationContent />
    </Suspense>
  );
}

function ReconciliationContent() {
  const router = useRouter();
  const { alert: alertDialog } = useConfirmDialog();
  const searchParams = useSearchParams();
  const initialAccountId = searchParams.get("account");
  const showImport = searchParams.get("import") === "true";

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId || "");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showImportModal, setShowImportModal] = useState(showImport);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());

  const accounts = useQuery(api.bankAccounts.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const transactions = useQuery(
    api.bankTransactions.getAll,
    user ? { userId: user.id as Id<"users">, ...(selectedAccountId ? { bankAccountId: selectedAccountId as Id<"bankAccounts"> } : {}) } : "skip"
  );
  const xeroConnection = useQuery(api.xero.getConnection);
  const importCSV = useMutation(api.bankTransactions.importCSV);
  const categorize = useMutation(api.bankTransactions.categorize);
  const bulkCategorize = useMutation(api.bankTransactions.bulkCategorize);
  const setExcluded = useMutation(api.bankTransactions.setExcluded);
  const runAutoMatch = useMutation(api.bankTransactions.runAutoMatch);
  const syncBankTransactions = useAction(api.xero.syncBankTransactions);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  if (!user) {
    return <LoadingScreen />;
  }

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesStatus = filterStatus === "all" || tx.matchStatus === filterStatus;
    const matchesCategory = filterCategory === "all" || tx.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const handleAutoMatch = async () => {
    if (!selectedAccountId) return;
    try {
      const result = await runAutoMatch({ userId: user!.id as Id<"users">, bankAccountId: selectedAccountId as Id<"bankAccounts"> });
      await alertDialog(`Auto-matched ${result.matched} transactions`);
    } catch (err) {
      await alertDialog("Auto-match failed. Please try again.");
    }
  };

  const handleXeroSync = async () => {
    if (!selectedAccountId) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      // Note: In production, you'd need to map the bank account to a Xero account ID
      // For now, we'll show a message to configure this in Xero settings
      const result = await syncBankTransactions({
        bankAccountId: selectedAccountId as Id<"bankAccounts">,
        xeroAccountId: "", // This should be configured per account
      });
      setSyncResult({
        success: true,
        message: `Synced ${result.imported} new transactions (${result.skipped} already existed)`,
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: `Sync failed: ${err}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isXeroConnected = xeroConnection?.connectionStatus === "connected";

  const handleBulkCategorize = async (category: CategoryType) => {
    if (selectedTransactions.size === 0) return;
    try {
      await bulkCategorize({
        userId: user!.id as Id<"users">,
        transactionIds: Array.from(selectedTransactions) as Id<"bankTransactions">[],
        category,
      });
      setSelectedTransactions(new Set());
    } catch (err) {
    }
  };

  const toggleSelectAll = () => {
    if (!filteredTransactions) return;
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map((tx) => tx._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedTransactions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTransactions(newSet);
  };

  return (
    <RequireAuth>
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
            <li>
              <Link href="/financials/bank-accounts" className="hover:text-white">
                Bank Accounts
              </Link>
            </li>
            <li>/</li>
            <li className="text-white">Reconciliation</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Bank Reconciliation</h2>
            <p className="text-gray-400 mt-1">
              Sync and match bank transactions
              {xeroConnection && (
                <span className="ml-2">
                  {isXeroConnected ? (
                    <span className="text-green-400 text-sm">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      Xero Connected
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-sm">
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                      Xero Not Connected
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAutoMatch}
              disabled={!selectedAccountId}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Auto-Match
            </button>
            {isXeroConnected ? (
              <button
                onClick={handleXeroSync}
                disabled={!selectedAccountId || isSyncing}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync from Xero
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/settings/integrations/xero"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect Xero
              </Link>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              title="Import transactions from CSV file"
            >
              CSV Import
            </button>
          </div>
        </div>

        {/* Sync Result Message */}
        {syncResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              syncResult.success
                ? "bg-green-900/30 border border-green-800 text-green-300"
                : "bg-red-900/30 border border-red-800 text-red-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{syncResult.message}</span>
              <button
                onClick={() => setSyncResult(null)}
                className="text-current opacity-70 hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Account Selector and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bank Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="">All Accounts</option>
                {accounts?.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.bankName} - {account.accountName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Match Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="unmatched">Unmatched</option>
                <option value="matched">Matched</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="sda_income">SDA Income</option>
                <option value="rrc_income">RRC Income</option>
                <option value="owner_payment">Owner Payment</option>
                <option value="maintenance">Maintenance</option>
                <option value="other_income">Other Income</option>
                <option value="other_expense">Other Expense</option>
                <option value="transfer">Transfer</option>
                <option value="uncategorized">Uncategorized</option>
              </select>
            </div>
            <div className="flex items-end">
              {selectedTransactions.size > 0 && (
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkCategorize(e.target.value as CategoryType);
                        e.target.value = "";
                      }
                    }}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>Bulk Categorize ({selectedTransactions.size})</option>
                    <option value="sda_income">SDA Income</option>
                    <option value="rrc_income">RRC Income</option>
                    <option value="owner_payment">Owner Payment</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other_income">Other Income</option>
                    <option value="other_expense">Other Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {transactions && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Transactions"
              value={transactions.length.toString()}
              color="blue"
            />
            <StatCard
              label="Unmatched"
              value={transactions.filter((t) => t.matchStatus === "unmatched").length.toString()}
              color={transactions.filter((t) => t.matchStatus === "unmatched").length > 0 ? "yellow" : "green"}
            />
            <StatCard
              label="Matched"
              value={transactions.filter((t) => t.matchStatus === "matched").length.toString()}
              color="green"
            />
            <StatCard
              label="Total Credits"
              value={formatCurrency(
                transactions
                  .filter((t) => t.amount > 0)
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
              color="green"
            />
          </div>
        )}

        {/* Transactions Table */}
        {transactions === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading transactions...</div>
        ) : !accounts || accounts.length === 0 ? (
          <EmptyAccountState />
        ) : filteredTransactions && filteredTransactions.length === 0 ? (
          <EmptyTransactionState onImport={() => setShowImportModal(true)} isXeroConnected={isXeroConnected} />
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredTransactions?.length === selectedTransactions.size && selectedTransactions.size > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredTransactions?.map((tx) => (
                    <TransactionRow
                      key={tx._id}
                      transaction={tx}
                      isSelected={selectedTransactions.has(tx._id)}
                      onToggleSelect={() => toggleSelect(tx._id)}
                      onCategorize={async (category) => {
                        await categorize({ userId: user!.id as Id<"users">, transactionId: tx._id, category });
                      }}
                      onToggleExclude={async () => {
                        await setExcluded({
                          userId: user!.id as Id<"users">,
                          transactionId: tx._id,
                          excluded: tx.matchStatus !== "excluded"
                        });
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results count */}
        {filteredTransactions && filteredTransactions.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          accounts={accounts || []}
          selectedAccountId={selectedAccountId}
          onClose={() => setShowImportModal(false)}
          onImport={(args) => importCSV({ ...args, userId: user!.id as Id<"users"> })}
        />
      )}
    </div>
    </RequireAuth>
  );
}

function TransactionRow({
  transaction,
  isSelected,
  onToggleSelect,
  onCategorize,
  onToggleExclude,
}: {
  transaction: {
    _id: Id<"bankTransactions">;
    transactionDate: string;
    description: string;
    reference?: string;
    amount: number;
    matchStatus: string;
    category?: CategoryType;
  };
  isSelected: boolean;
  onToggleSelect: () => void;
  onCategorize: (category: CategoryType) => Promise<void>;
  onToggleExclude: () => Promise<void>;
}) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      matched: "bg-green-600/20 text-green-400",
      unmatched: "bg-yellow-600/20 text-yellow-400",
      excluded: "bg-gray-600/20 text-gray-400",
      partially_matched: "bg-orange-600/20 text-orange-400",
    };
    return styles[status] || styles.unmatched;
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return "";
    const styles: Record<string, string> = {
      sda_income: "bg-teal-700/20 text-teal-500",
      rrc_income: "bg-purple-600/20 text-purple-400",
      owner_payment: "bg-orange-600/20 text-orange-400",
      maintenance: "bg-red-600/20 text-red-400",
      other_income: "bg-green-600/20 text-green-400",
      other_expense: "bg-pink-600/20 text-pink-400",
      transfer: "bg-cyan-600/20 text-cyan-400",
      uncategorized: "bg-gray-600/20 text-gray-400",
    };
    return styles[category] || "";
  };

  const formatCategory = (category?: string) => {
    if (!category) return "-";
    return category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <tr className={`hover:bg-gray-700 ${transaction.matchStatus === "excluded" ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 bg-gray-700 border-gray-600 rounded"
        />
      </td>
      <td className="px-4 py-3 text-sm text-white whitespace-nowrap">
        {transaction.transactionDate}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300 max-w-md truncate" title={transaction.description}>
        {transaction.description}
        {transaction.reference && (
          <span className="text-gray-400 text-xs block">Ref: {transaction.reference}</span>
        )}
      </td>
      <td className={`px-4 py-3 text-sm text-right font-mono ${transaction.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
        {formatCurrency(transaction.amount)}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(transaction.matchStatus)}`}>
          {transaction.matchStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <select
          value={transaction.category || ""}
          onChange={(e) => onCategorize(e.target.value as CategoryType)}
          className={`px-2 py-1 text-xs rounded bg-transparent border-0 cursor-pointer ${getCategoryBadge(transaction.category)}`}
        >
          <option value="">-</option>
          <option value="sda_income">SDA Income</option>
          <option value="rrc_income">RRC Income</option>
          <option value="owner_payment">Owner Payment</option>
          <option value="maintenance">Maintenance</option>
          <option value="other_income">Other Income</option>
          <option value="other_expense">Other Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onToggleExclude}
          className="text-gray-400 hover:text-white text-xs"
          title={transaction.matchStatus === "excluded" ? "Include" : "Exclude"}
        >
          {transaction.matchStatus === "excluded" ? "Include" : "Exclude"}
        </button>
      </td>
    </tr>
  );
}

function ImportModal({
  accounts,
  selectedAccountId,
  onClose,
  onImport,
}: {
  accounts: BankAccount[];
  selectedAccountId: string;
  onClose: () => void;
  onImport: (args: {
    bankAccountId: Id<"bankAccounts">;
    bankFormat: "anz" | "westpac";
    transactions: Array<{
      date: string;
      description: string;
      reference?: string;
      amount: number;
      balance?: number;
    }>;
  }) => Promise<{ success: boolean; imported: number; duplicates: number; importBatchId: string }>;
}) {
  const { alert: alertDialog } = useConfirmDialog();
  const [accountId, setAccountId] = useState(selectedAccountId || (accounts[0]?._id ?? ""));
  const [bankFormat, setBankFormat] = useState<"anz" | "westpac">("anz");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((a) => a._id === accountId);

  useEffect(() => {
    if (selectedAccount) {
      if (selectedAccount.bankName.toLowerCase().includes("anz")) {
        setBankFormat("anz");
      } else if (selectedAccount.bankName.toLowerCase().includes("westpac")) {
        setBankFormat("westpac");
      }
    }
  }, [selectedAccount]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string, format: "anz" | "westpac") => {
    const lines = csv.trim().split("\n");
    const transactions: Array<{
      date: string;
      description: string;
      reference?: string;
      amount: number;
      balance?: number;
    }> = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV respecting quoted fields
      const fields = parseCSVLine(line);

      if (format === "anz") {
        // ANZ Format: Date,Amount,Description,Balance
        if (fields.length >= 3) {
          const dateStr = fields[0];
          const amount = parseFloat(fields[1]);
          const description = fields[2];
          const balance = fields[3] ? parseFloat(fields[3]) : undefined;

          // Convert date from DD/MM/YYYY to YYYY-MM-DD
          const dateParts = dateStr.split("/");
          const date = dateParts.length === 3
            ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
            : dateStr;

          transactions.push({
            date,
            description,
            amount,
            balance,
          });
        }
      } else {
        // Westpac Format: Date,Narration,Debit,Credit,Balance
        if (fields.length >= 4) {
          const dateStr = fields[0];
          const description = fields[1];
          const debit = fields[2] ? parseFloat(fields[2]) : 0;
          const credit = fields[3] ? parseFloat(fields[3]) : 0;
          const balance = fields[4] ? parseFloat(fields[4]) : undefined;

          // Convert date from DD/MM/YYYY to YYYY-MM-DD
          const dateParts = dateStr.split("/");
          const date = dateParts.length === 3
            ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
            : dateStr;

          const amount = credit > 0 ? credit : -debit;

          transactions.push({
            date,
            description,
            amount,
            balance,
          });
        }
      }
    }

    return transactions;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const handleImport = async () => {
    if (!accountId || !csvText) return;

    setImporting(true);
    try {
      const transactions = parseCSV(csvText, bankFormat);

      if (transactions.length === 0) {
        await alertDialog("No valid transactions found in the CSV. Please check the format.");
        setImporting(false);
        return;
      }

      const importResult = await onImport({
        bankAccountId: accountId as Id<"bankAccounts">,
        bankFormat,
        transactions,
      });

      setResult({ imported: importResult.imported, duplicates: importResult.duplicates });
    } catch (err) {
      await alertDialog("Import failed. Please check the CSV format and try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Import Bank Transactions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-6xl mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Import Complete</h4>
            <p className="text-gray-400 mb-4">
              {result.imported} transaction{result.imported !== 1 ? "s" : ""} imported
              {result.duplicates > 0 && `, ${result.duplicates} duplicate${result.duplicates !== 1 ? "s" : ""} skipped`}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bank Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.bankName} - {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">CSV Format</label>
                  <select
                    value={bankFormat}
                    onChange={(e) => setBankFormat(e.target.value as "anz" | "westpac")}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="anz">ANZ (Date, Amount, Description, Balance)</option>
                    <option value="westpac">Westpac (Date, Narration, Debit, Credit, Balance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Upload CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-teal-700 file:text-white file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Or paste CSV content directly
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={
                    bankFormat === "anz"
                      ? "Date,Amount,Description,Balance\n01/02/2026,-5000.00,PAYMENT TO OWNER,15000.00"
                      : "Date,Narration,Debit,Credit,Balance\n01/02/2026,NDIS PAYMENT,,6500.00,21500.00"
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm h-40"
                />
              </div>

              <div className="bg-gray-700 rounded-lg p-4 text-sm">
                <h4 className="font-medium text-white mb-2">Expected CSV Format</h4>
                {bankFormat === "anz" ? (
                  <div className="text-gray-300">
                    <p className="font-mono text-xs mb-2">Date,Amount,Description,Balance</p>
                    <p className="font-mono text-xs">01/02/2026,-5000.00,PAYMENT TO OWNER,15000.00</p>
                  </div>
                ) : (
                  <div className="text-gray-300">
                    <p className="font-mono text-xs mb-2">Date,Narration,Debit,Credit,Balance</p>
                    <p className="font-mono text-xs">01/02/2026,NDIS PAYMENT,,6500.00,21500.00</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !csvText || !accountId}
                className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {importing ? "Importing..." : "Import Transactions"}
              </button>
            </div>
          </>
        )}
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
    blue: "text-teal-500",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

function EmptyAccountState() {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
      <div className="text-gray-400 text-6xl mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Bank Accounts</h3>
      <p className="text-gray-400 mb-6">
        Add a bank account first before importing transactions.
      </p>
      <Link
        href="/financials/bank-accounts"
        className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors inline-block"
      >
        Add Bank Account
      </Link>
    </div>
  );
}

function EmptyTransactionState({ onImport, isXeroConnected }: { onImport: () => void; isXeroConnected: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
      <div className="text-gray-400 text-6xl mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Transactions</h3>
      <p className="text-gray-400 mb-6">
        {isXeroConnected
          ? "Click 'Sync from Xero' above to import transactions from your connected bank accounts."
          : "Connect to Xero to automatically sync bank transactions, or import a CSV file manually."}
      </p>
      <div className="flex gap-3 justify-center">
        {isXeroConnected ? (
          <p className="text-teal-500 text-sm">
            Use the &quot;Sync from Xero&quot; button above to get started
          </p>
        ) : (
          <>
            <Link
              href="/settings/integrations/xero"
              className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
            >
              Connect Xero
            </Link>
            <button
              onClick={onImport}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Import CSV
            </button>
          </>
        )}
      </div>
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
