"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import { formatStatus, formatFileSize, formatDate } from "@/utils/format";
import { useAuth } from "@/hooks/useAuth";
import GlobalUploadModal from "@/components/GlobalUploadModal";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import HelpGuidePanel from "@/components/ui/HelpGuidePanel";
import { HELP_GUIDES } from "@/constants/helpGuides";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const documents = useQuery(api.documents.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const stats = useQuery(api.documents.getStats, user ? { userId: user.id as Id<"users"> } : "skip");

  // Memoize filtered documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    return documents.filter((doc) => {
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
  }, [documents, filterType, filterCategory, searchTerm]);

  const hasFilters = searchTerm !== "" || filterType !== "all" || filterCategory !== "all";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Evidence Vault</h1>
              <p className="text-gray-400 mt-1">Manage and organize important files</p>
            </div>
            <div className="flex items-center gap-3">
              <HelpGuideButton onClick={() => setShowHelp(true)} />
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                + Upload Document
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Documents" value={stats.total} color="blue" />
              <StatCard title="NDIS Plans" value={stats.byType.ndis_plan || 0} color="green" />
              <StatCard title="Leases" value={stats.byType.lease || 0} color="yellow" />
              <StatCard title="Expiring Soon" value={stats.expiringSoon} color="red" />
            </div>
          )}

          {/* Filters */}
          <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
            <legend className="sr-only">Filter documents</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">
                  Search
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filename, description, linked entity..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-300 mb-1">
                  Document Type
                </label>
                <select
                  id="type-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
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
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-300 mb-1">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="participant">Participant</option>
                  <option value="property">Property</option>
                  <option value="dwelling">Dwelling</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Results count */}
          {documents !== undefined && (
            <p className="text-sm text-gray-400 mb-4" aria-live="polite">
              Showing {filteredDocuments.length} of {documents.length} documents
              {hasFilters && " (filtered)"}
            </p>
          )}

          {/* Documents List */}
          {documents === undefined ? (
            <LoadingScreen fullScreen={false} message="Loading documents..." />
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No documents found" : "No documents uploaded yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "Start organizing by uploading your first document"
              }
              icon={<svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
              action={
                !hasFilters
                  ? {
                      label: "+ Upload First Document",
                      href: "/documents/new",
                    }
                  : undefined
              }
              isFiltered={hasFilters}
            />
          ) : (
            <div className="space-y-4" role="list" aria-label="Documents list">
              {filteredDocuments.map((doc) => (
                <DocumentCard key={doc._id} document={doc} />
              ))}
            </div>
          )}
        </main>
      </div>

      <HelpGuidePanel
        guide={HELP_GUIDES.documents}
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Global Upload Modal */}
      <GlobalUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          // Documents will refresh automatically via Convex reactivity
        }}
      />
    </RequireAuth>
  );
}

function DocumentCard({ document }: { document: any }) {
  const linkedEntity = useMemo(() => {
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
  }, [document.participant, document.property, document.dwelling, document.owner]);

  const expiryStatus = useMemo(() => {
    if (!document.expiryDate) return { isExpiring: false, isExpired: false };

    const expiryDate = new Date(document.expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return {
      isExpired: expiryDate < today,
      isExpiring: expiryDate <= thirtyDaysFromNow && expiryDate >= today,
    };
  }, [document.expiryDate]);

  return (
    <article
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/80 transition-colors"
      role="listitem"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-teal-700 text-white text-xs rounded-full">
              {formatStatus(document.documentType)}
            </span>
            <span className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full capitalize">
              {document.documentCategory}
            </span>
            {expiryStatus.isExpired && (
              <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full">EXPIRED</span>
            )}
            {expiryStatus.isExpiring && !expiryStatus.isExpired && (
              <span className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-full">
                EXPIRING SOON
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">{document.fileName}</h2>
          {document.description && (
            <p className="text-gray-300 text-sm mb-3">{document.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {document.downloadUrl && (
            <a
              href={document.downloadUrl}
              download={document.fileName}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Download
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Linked To</p>
          {linkedEntity ? (
            linkedEntity.link ? (
              <Link
                href={linkedEntity.link}
                className="text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:underline"
              >
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
          <p className="text-gray-400 text-xs">File Size</p>
          <p className="text-white">{formatFileSize(document.fileSize)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Uploaded</p>
          <p className="text-white">{formatDate(document.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Expiry Date</p>
          <p className={expiryStatus.isExpired ? "text-red-400" : "text-white"}>
            {document.expiryDate || "-"}
          </p>
        </div>
      </div>
    </article>
  );
}
