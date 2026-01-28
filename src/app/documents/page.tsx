"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const documents = useQuery(api.documents.getAll);
  const stats = useQuery(api.documents.getStats);

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

  // Filter documents
  const filteredDocuments = documents?.filter((doc) => {
    const matchesType = filterType === "all" || doc.documentType === filterType;
    const matchesCategory = filterCategory === "all" || doc.documentCategory === filterCategory;
    const matchesSearch =
      !searchTerm ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.property?.addressLine1.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Documents</h2>
            <p className="text-gray-400 mt-1">Manage and organize important files</p>
          </div>
          <Link
            href="/documents/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Upload Document
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Total Documents" value={stats.total.toString()} color="blue" />
            <StatCard
              label="NDIS Plans"
              value={stats.byType.ndis_plan.toString()}
              color="green"
            />
            <StatCard label="Leases" value={stats.byType.lease.toString()} color="yellow" />
            <StatCard
              label="With Expiry"
              value={stats.withExpiry.toString()}
              color="red"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filename, description, linked entity..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Document Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="ndis_plan">NDIS Plan</option>
                <option value="service_agreement">Service Agreement</option>
                <option value="lease">Lease</option>
                <option value="insurance">Insurance</option>
                <option value="compliance">Compliance</option>
                <option value="report">Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="participant">Participant</option>
                <option value="property">Property</option>
                <option value="dwelling">Dwelling</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {documents === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading documents...</div>
        ) : filteredDocuments && filteredDocuments.length === 0 ? (
          <EmptyState
            hasFilters={searchTerm !== "" || filterType !== "all" || filterCategory !== "all"}
          />
        ) : (
          <div className="space-y-4">
            {filteredDocuments?.map((doc) => (
              <DocumentCard key={doc._id} document={doc} />
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredDocuments && filteredDocuments.length > 0 && (
          <p className="text-gray-400 text-sm text-center mt-6">
            Showing {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(
    null
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sda_user");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              SDA Management
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link
                href="/participants"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link
                href="/maintenance"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Maintenance
              </Link>
              <Link href="/documents" className="text-white font-medium">
                Documents
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                {user.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
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
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

function DocumentCard({ document }: { document: any }) {
  const formatDocumentType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getLinkedEntity = () => {
    if (document.participant) {
      return {
        name: `${document.participant.firstName} ${document.participant.lastName}`,
        link: `/participants/${document.participant._id}`,
        type: "Participant",
      };
    }
    if (document.property) {
      return {
        name: document.property.propertyName || document.property.addressLine1,
        link: `/properties/${document.property._id}`,
        type: "Property",
      };
    }
    if (document.dwelling) {
      return {
        name: document.dwelling.dwellingName,
        link: null,
        type: "Dwelling",
      };
    }
    if (document.owner) {
      return {
        name:
          document.owner.ownerType === "company"
            ? document.owner.companyName
            : `${document.owner.firstName} ${document.owner.lastName}`,
        link: null,
        type: "Owner",
      };
    }
    return null;
  };

  const linkedEntity = getLinkedEntity();

  const isExpiring = document.expiryDate
    ? new Date(document.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  const isExpired = document.expiryDate ? new Date(document.expiryDate) < new Date() : false;

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
              {formatDocumentType(document.documentType)}
            </span>
            <span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full capitalize">
              {document.documentCategory}
            </span>
            {isExpired && (
              <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                EXPIRED
              </span>
            )}
            {isExpiring && !isExpired && (
              <span className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-full">
                EXPIRING SOON
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{document.fileName}</h3>
          {document.description && (
            <p className="text-gray-300 text-sm mb-3">{document.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {document.downloadUrl && (
            <a
              href={document.downloadUrl}
              download={document.fileName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Download
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Linked To</p>
          {linkedEntity ? (
            linkedEntity.link ? (
              <Link href={linkedEntity.link} className="text-blue-400 hover:text-blue-300">
                {linkedEntity.name}
              </Link>
            ) : (
              <p className="text-white">{linkedEntity.name}</p>
            )
          ) : (
            <p className="text-gray-400">-</p>
          )}
        </div>
        <div>
          <p className="text-gray-500 text-xs">File Size</p>
          <p className="text-white">{formatFileSize(document.fileSize)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Uploaded</p>
          <p className="text-white">
            {new Date(document.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Expiry Date</p>
          <p className={`${isExpired ? "text-red-400" : "text-white"}`}>
            {document.expiryDate || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-500 text-6xl mb-4">📄</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No documents found" : "No documents uploaded yet"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters
          ? "Try adjusting your filters to see more results"
          : "Start organizing by uploading your first document"}
      </p>
      {!hasFilters && (
        <Link
          href="/documents/new"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Upload First Document
        </Link>
      )}
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
