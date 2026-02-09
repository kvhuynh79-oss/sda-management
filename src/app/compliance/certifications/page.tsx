"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, StatCard } from "@/components/ui";
import Badge from "@/components/ui/Badge";
import { formatDate, formatStatus } from "@/utils/format";

const CERT_TYPE_LABELS: Record<string, string> = {
  ndis_practice_standards: "NDIS Practice Standards",
  ndis_verification_audit: "NDIS Verification Audit",
  sda_design_standard: "SDA Design Standard",
  sda_registration: "SDA Registration",
  ndis_worker_screening: "Worker Screening",
  fire_safety: "Fire Safety",
  building_compliance: "Building Compliance",
  other: "Other",
};

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "error" | "purple"; label: string }> = {
  current: { variant: "success", label: "Current" },
  expiring_soon: { variant: "warning", label: "Expiring Soon" },
  expired: { variant: "error", label: "Expired" },
  pending_renewal: { variant: "purple", label: "Pending Renewal" },
};

const AUDIT_OUTCOME_BADGE: Record<string, { variant: "success" | "warning" | "error" | "info"; label: string }> = {
  pass: { variant: "success", label: "Pass" },
  conditional_pass: { variant: "warning", label: "Conditional Pass" },
  fail: { variant: "error", label: "Fail" },
  pending: { variant: "info", label: "Pending" },
};

function CertificationsContent() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const certifications = useQuery(api.complianceCertifications.getAll, user ? {
    userId: user.id as Id<"users">,
    certificationType: filterType || undefined,
    status: filterStatus || undefined,
    propertyId: filterProperty ? (filterProperty as Id<"properties">) : undefined,
  } : "skip");
  const expiringSoon = useQuery(api.complianceCertifications.getExpiringSoon, user ? { userId: user.id as Id<"users"> } : "skip");
  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const removeCert = useMutation(api.complianceCertifications.remove);

  useEffect(() => {
    const stored = localStorage.getItem("sda_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Invalid data
      }
    }
  }, []);

  // Compute stats from the unfiltered data
  const allCerts = useQuery(api.complianceCertifications.getAll, user ? { userId: user.id as Id<"users"> } : "skip");

  const stats = useMemo(() => {
    if (!allCerts) return null;
    return {
      total: allCerts.length,
      current: allCerts.filter((c) => c.status === "current").length,
      expiringSoon: allCerts.filter((c) => c.status === "expiring_soon").length,
      expired: allCerts.filter((c) => c.status === "expired").length,
      pendingRenewal: allCerts.filter((c) => c.status === "pending_renewal").length,
    };
  }, [allCerts]);

  // Search filter (client-side on already-filtered results)
  const filteredCerts = useMemo(() => {
    if (!certifications) return [];
    if (!searchTerm) return certifications;
    const term = searchTerm.toLowerCase();
    return certifications.filter(
      (c) =>
        c.certificationName.toLowerCase().includes(term) ||
        c.certificationType.toLowerCase().includes(term) ||
        c.certifyingBody?.toLowerCase().includes(term) ||
        c.certificateNumber?.toLowerCase().includes(term) ||
        c.property?.propertyName?.toLowerCase().includes(term) ||
        c.property?.addressLine1?.toLowerCase().includes(term)
    );
  }, [certifications, searchTerm]);

  const daysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleDelete = async (certId: Id<"complianceCertifications">) => {
    if (!user) return;
    try {
      await removeCert({
        userId: user.id as Id<"users">,
        certificationId: certId,
      });
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete certification");
    }
  };

  const hasFilters = filterType || filterStatus || filterProperty || searchTerm;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/compliance"
              className="text-teal-500 hover:text-teal-400 text-sm mb-2 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              &larr; Back to Compliance Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Compliance Certifications</h1>
            <p className="text-gray-400 mt-1">
              Manage NDIS certifications, registrations, and safety certificates
            </p>
          </div>
          <Link
            href="/compliance/certifications/new"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            + Add Certification
          </Link>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Certifications" value={stats.total} color="blue" />
            <StatCard title="Current" value={stats.current} color="green" />
            <StatCard title="Expiring Soon" value={stats.expiringSoon} color="yellow" />
            <StatCard title="Expired" value={stats.expired} color="red" />
          </div>
        )}

        {/* Expiring Soon Alert Section */}
        {expiringSoon && expiringSoon.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Expiring Within 90 Days ({expiringSoon.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expiringSoon.map((cert) => {
                const days = daysUntilExpiry(cert.expiryDate);
                return (
                  <div
                    key={cert._id}
                    className="bg-yellow-900/20 border border-yellow-600/40 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium truncate">
                          {cert.certificationName}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {CERT_TYPE_LABELS[cert.certificationType] || formatStatus(cert.certificationType)}
                        </p>
                        {cert.property && (
                          <p className="text-gray-400 text-xs mt-1">
                            {cert.property.propertyName || cert.property.addressLine1}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`text-lg font-bold ${days <= 30 ? "text-red-400" : "text-yellow-400"}`}>
                          {days}d
                        </p>
                        <p className="text-gray-400 text-xs">remaining</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-gray-400 text-xs">
                        Expires: {formatDate(cert.expiryDate)}
                      </span>
                      <Link
                        href={`/compliance/certifications/new`}
                        className="text-teal-500 hover:text-teal-400 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                      >
                        Renew
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <fieldset className="bg-gray-800 rounded-lg p-4 mb-6">
          <legend className="sr-only">Filter certifications</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="cert-search" className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <input
                id="cert-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, certifier, number..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label htmlFor="cert-type-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Type
              </label>
              <select
                id="cert-type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Types</option>
                {Object.entries(CERT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="cert-status-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Status
              </label>
              <select
                id="cert-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="current">Current</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="pending_renewal">Pending Renewal</option>
              </select>
            </div>

            {/* Property Filter */}
            <div>
              <label htmlFor="cert-property-filter" className="block text-sm font-medium text-gray-300 mb-1">
                Property
              </label>
              <select
                id="cert-property-filter"
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-600 transition-colors"
              >
                <option value="">All Properties</option>
                {properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.propertyName || p.addressLine1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setFilterType("");
                setFilterStatus("");
                setFilterProperty("");
                setSearchTerm("");
              }}
              className="mt-3 text-sm text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear all filters
            </button>
          )}
        </fieldset>

        {/* Certifications Table */}
        {certifications === undefined ? (
          <LoadingScreen fullScreen={false} message="Loading certifications..." />
        ) : filteredCerts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-400 mb-4">
              {hasFilters
                ? "No certifications match your filters"
                : "No certifications recorded yet"}
            </p>
            {!hasFilters && (
              <Link
                href="/compliance/certifications/new"
                className="inline-flex items-center px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors"
              >
                + Add First Certification
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Name
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Type
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Scope
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Status
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Issue Date
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Expiry Date
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-gray-400">
                      Audit
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCerts.map((cert) => {
                    const statusInfo = STATUS_BADGE[cert.status] || { variant: "neutral" as const, label: formatStatus(cert.status) };
                    const days = daysUntilExpiry(cert.expiryDate);
                    const isDeleting = deleteConfirm === cert._id;

                    return (
                      <tr
                        key={cert._id}
                        className="hover:bg-gray-700/50 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white text-sm font-medium">
                              {cert.certificationName}
                            </p>
                            {cert.certifyingBody && (
                              <p className="text-gray-400 text-xs mt-0.5">
                                {cert.certifyingBody}
                              </p>
                            )}
                            {cert.certificateNumber && (
                              <p className="text-gray-400 text-xs">
                                #{cert.certificateNumber}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="text-gray-300 text-sm">
                            {CERT_TYPE_LABELS[cert.certificationType] || formatStatus(cert.certificationType)}
                          </span>
                        </td>

                        {/* Scope */}
                        <td className="px-4 py-3">
                          {cert.isOrganizationWide ? (
                            <Badge variant="info" size="xs">Org-wide</Badge>
                          ) : cert.property ? (
                            <Link
                              href={`/properties/${cert.property._id}`}
                              className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                            >
                              {cert.property.propertyName || cert.property.addressLine1}
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant} size="xs" dot>
                            {statusInfo.label}
                          </Badge>
                          {(cert.status === "expiring_soon" || cert.status === "expired") && (
                            <p className={`text-xs mt-0.5 ${days < 0 ? "text-red-400" : "text-yellow-400"}`}>
                              {days < 0
                                ? `${Math.abs(days)}d overdue`
                                : `${days}d remaining`}
                            </p>
                          )}
                        </td>

                        {/* Issue Date */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(cert.issueDate)}
                        </td>

                        {/* Expiry Date */}
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {formatDate(cert.expiryDate)}
                        </td>

                        {/* Audit */}
                        <td className="px-4 py-3">
                          {cert.auditOutcome ? (
                            <Badge
                              variant={AUDIT_OUTCOME_BADGE[cert.auditOutcome]?.variant || "neutral"}
                              size="xs"
                            >
                              {AUDIT_OUTCOME_BADGE[cert.auditOutcome]?.label || formatStatus(cert.auditOutcome)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {isDeleting ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-red-400 text-xs">Delete?</span>
                              <button
                                onClick={() => handleDelete(cert._id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/compliance/certifications/${cert._id}`}
                                className="text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                              >
                                View
                              </Link>
                              {(user?.role === "admin" || user?.role === "property_manager") && (
                                <button
                                  onClick={() => setDeleteConfirm(cert._id)}
                                  className="text-red-400 hover:text-red-300 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            <div className="px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
              Showing {filteredCerts.length} certification{filteredCerts.length !== 1 ? "s" : ""}
              {hasFilters && certifications && filteredCerts.length !== certifications.length
                ? ` of ${certifications.length}`
                : ""}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComplianceCertificationsPage() {
  return (
    <RequireAuth>
      <CertificationsContent />
    </RequireAuth>
  );
}
