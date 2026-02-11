"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate, formatStatus } from "@/utils/format";
import SOP001Overlay from "@/components/compliance/SOP001Overlay";

type TabType = "overview" | "certifications" | "insurance" | "complaints" | "incidents" | "emergency";

const TAB_ITEMS: { id: TabType; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "certifications", label: "Certifications" },
  { id: "insurance", label: "Insurance" },
  { id: "complaints", label: "Complaints" },
  { id: "incidents", label: "NDIS Incidents" },
  { id: "emergency", label: "Emergency & BCP" },
];

function ComplianceContent() {
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedGuide, setExpandedGuide] = useState<"incidents" | "complaints" | "certifications" | null>(null);
  const [showSopOverlay, setShowSopOverlay] = useState(false);

  const certifications = useQuery(api.complianceCertifications.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const expiringSoonCerts = useQuery(api.complianceCertifications.getExpiringSoon, user ? { userId: user.id as Id<"users"> } : "skip");
  const insurancePolicies = useQuery(api.insurancePolicies.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const insuranceCoverage = useQuery(api.insurancePolicies.checkRequiredCoverage, user ? { userId: user.id as Id<"users"> } : "skip");
  const complaintsStats = useQuery(api.complaints.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const incidentStats = useQuery(api.incidents.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const empStats = useQuery(api.emergencyManagementPlans.getStats, user ? { userId: user.id as Id<"users"> } : "skip");
  const bcpStats = useQuery(api.businessContinuityPlans.getStats, user ? { userId: user.id as Id<"users"> } : "skip");

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      current: "bg-green-600",
      expiring_soon: "bg-yellow-600",
      expired: "bg-red-600",
      pending_renewal: "bg-orange-600",
    };
    return colors[status] || "bg-gray-600";
  };

  // Memoize compliance score
  const compliance = useMemo(() => {
    let score = 100;
    let issues = 0;

    if (certifications) {
      const expired = certifications.filter(c => c.status === "expired").length;
      const expiringSoon = certifications.filter(c => c.status === "expiring_soon").length;
      score -= expired * 15;
      score -= expiringSoon * 5;
      issues += expired + expiringSoon;
    }

    if (insuranceCoverage) {
      const missing = insuranceCoverage.filter(c => !c.hasCoverage).length;
      const insufficient = insuranceCoverage.filter(c => c.hasCoverage && !c.meetsCoverage).length;
      score -= missing * 20;
      score -= insufficient * 10;
      issues += missing + insufficient;
    }

    if (incidentStats?.ndisReportable) {
      score -= incidentStats.ndisReportable.overdue * 25;
      issues += incidentStats.ndisReportable.overdue;
    }

    if (complaintsStats) {
      score -= complaintsStats.overdueAcknowledgments * 10;
      issues += complaintsStats.overdueAcknowledgments;
    }

    if (empStats) {
      score -= (empStats.overdueReview || 0) * 10;
      issues += empStats.overdueReview || 0;
    }
    if (bcpStats && !bcpStats.hasActivePlan) {
      score -= 20;
      issues += 1;
    }

    return { score: Math.max(0, score), issues };
  }, [certifications, insuranceCoverage, incidentStats, complaintsStats, empStats, bcpStats]);

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor NDIS compliance, certifications, and insurance</p>
        </div>

        {/* Compliance Score Banner */}
        <div
          role="region"
          aria-label="Compliance score"
          className={`rounded-lg p-6 mb-6 ${
            compliance.score >= 80 ? "bg-green-900/30 border border-green-600" :
            compliance.score >= 60 ? "bg-yellow-900/30 border border-yellow-600" :
            "bg-red-900/30 border border-red-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Compliance Score</h2>
              <p className="text-gray-300 text-sm mt-1">
                {compliance.issues === 0
                  ? "All compliance requirements are met"
                  : `${compliance.issues} issue${compliance.issues > 1 ? "s" : ""} requiring attention`
                }
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                compliance.score >= 80 ? "text-green-400" :
                compliance.score >= 60 ? "text-yellow-400" :
                "text-red-400"
              }`}>
                {compliance.score}%
              </div>
              <div className="text-gray-400 text-sm">
                {compliance.score >= 80 ? "Good" : compliance.score >= 60 ? "Needs Attention" : "Critical"}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Compliance sections"
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
        >
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  isActive
                    ? "bg-teal-700 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Certifications Card */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Certifications</h3>
                {!certifications ? (
                  <LoadingScreen fullScreen={false} message="Loading..." />
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current</span>
                        <span className="text-green-400">{certifications.filter(c => c.status === "current").length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Expiring Soon</span>
                        <span className="text-yellow-400">{certifications.filter(c => c.status === "expiring_soon").length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Expired</span>
                        <span className="text-red-400">{certifications.filter(c => c.status === "expired").length}</span>
                      </div>
                    </div>
                    <Link
                      href="/compliance/certifications"
                      className="mt-4 inline-flex items-center gap-1 text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      View all certifications &rarr;
                    </Link>
                  </>
                )}
              </div>

              {/* Insurance Card */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Insurance Coverage</h3>
                {!insuranceCoverage ? (
                  <LoadingScreen fullScreen={false} message="Loading..." />
                ) : (
                  <>
                    <div className="space-y-2">
                      {insuranceCoverage.map((coverage) => (
                        <div key={coverage.type} className="flex justify-between text-sm">
                          <span className="text-gray-400 truncate">{coverage.name.split("(")[0].trim()}</span>
                          <span className={coverage.meetsCoverage ? "text-green-400" : coverage.hasCoverage ? "text-yellow-400" : "text-red-400"}>
                            {coverage.meetsCoverage ? "✓" : coverage.hasCoverage ? "⚠" : "✗"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTab("insurance")}
                      className="mt-4 text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      View all policies →
                    </button>
                  </>
                )}
              </div>

              {/* Complaints Card */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Complaints</h3>
                {!complaintsStats ? (
                  <LoadingScreen fullScreen={false} message="Loading..." />
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Open</span>
                        <span className="text-white">{complaintsStats.byStatus.received + complaintsStats.byStatus.acknowledged + complaintsStats.byStatus.under_investigation}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Overdue Acknowledgments</span>
                        <span className={complaintsStats.overdueAcknowledgments > 0 ? "text-red-400" : "text-green-400"}>
                          {complaintsStats.overdueAcknowledgments}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Escalated to Commission</span>
                        <span className="text-orange-400">{complaintsStats.escalatedToCommission}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("complaints")}
                      className="mt-4 text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      View all complaints →
                    </button>
                  </>
                )}
              </div>

              {/* NDIS Incidents Card */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">NDIS Reportable</h3>
                {!incidentStats ? (
                  <LoadingScreen fullScreen={false} message="Loading..." />
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Reportable</span>
                        <span className="text-white">{incidentStats.ndisReportable.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Pending Notification</span>
                        <span className="text-yellow-400">{incidentStats.ndisReportable.pending}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Overdue</span>
                        <span className={incidentStats.ndisReportable.overdue > 0 ? "text-red-400 font-bold" : "text-green-400"}>
                          {incidentStats.ndisReportable.overdue}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("incidents")}
                      className="mt-4 text-teal-500 hover:text-teal-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      View reportable incidents →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === "certifications" && (
          <div role="tabpanel" id="panel-certifications" aria-labelledby="tab-certifications" className="space-y-6">
            {/* Certifications Guide */}
            <div className="bg-gray-800 rounded-lg p-4">
              <button
                onClick={() => setExpandedGuide(expandedGuide === "certifications" ? null : "certifications")}
                aria-expanded={expandedGuide === "certifications"}
                aria-controls="guide-certifications"
                className="w-full flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>
                  <span className="text-white font-medium">NDIS Certifications Guide</span>
                </div>
                <span className="text-gray-400" aria-hidden="true">{expandedGuide === "certifications" ? "▼" : "▶"}</span>
              </button>

              {expandedGuide === "certifications" && (
                <div id="guide-certifications" className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-red-300 font-semibold mb-2">Organisation-Level (Required)</h4>
                      <div className="space-y-2">
                        <div className="bg-gray-700/50 rounded-lg p-2">
                          <p className="text-white font-medium text-sm">NDIS Practice Standards</p>
                          <p className="text-gray-400 text-xs">Renewal: 3 years | Mid-term audit: 18 months</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-2">
                          <p className="text-white font-medium text-sm">SDA Provider Registration</p>
                          <p className="text-gray-400 text-xs">Renewal: 3 years | NDIS Commission</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-yellow-300 font-semibold mb-2">Property-Level</h4>
                      <div className="space-y-2">
                        <div className="bg-gray-700/50 rounded-lg p-2">
                          <p className="text-white font-medium text-sm">SDA Design Standard Certification</p>
                          <p className="text-gray-400 text-xs">One-time (unless modifications)</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-2">
                          <p className="text-white font-medium text-sm">Fire Safety Certificate</p>
                          <p className="text-yellow-400 text-xs font-medium">ANNUAL renewal required</p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-2">
                          <p className="text-white font-medium text-sm">Building Compliance Certificate</p>
                          <p className="text-gray-400 text-xs">One-time (unless modifications)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-green-300 font-semibold mb-2">Worker Requirements</h4>
                    <div className="bg-gray-700/50 rounded-lg p-2">
                      <p className="text-white font-medium text-sm">NDIS Worker Screening Check</p>
                      <p className="text-gray-400 text-xs">Renewal: 5 years | All workers with participant contact</p>
                      <p className="text-yellow-300 text-xs mt-1">Workers cannot start until clearance received!</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-900/30 rounded-lg" role="alert">
                    <h4 className="text-red-200 font-semibold mb-1">Non-Compliance Consequences</h4>
                    <p className="text-red-300 text-sm">Registration suspension/revocation - Civil penalties up to $93,900 - Banning orders</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Compliance Certifications</h2>
                <div className="flex items-center gap-3">
                  <Link
                    href="/compliance/certifications"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    View Full Page
                  </Link>
                  <Link
                    href="/compliance/certifications/new"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    + Add Certification
                  </Link>
                </div>
              </div>

              {!certifications ? (
                <LoadingScreen fullScreen={false} message="Loading certifications..." />
              ) : certifications.length === 0 ? (
                <EmptyState
                  title="No certifications recorded"
                  description="Add your first compliance certification to track its status."
                  action={{ label: "+ Add Certification", href: "/compliance/certifications/new" }}
                  icon={
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {certifications.map((cert) => (
                    <Link key={cert._id} href={`/compliance/certifications/${cert._id}`} className="block bg-gray-700 rounded-lg p-4 hover:bg-gray-600/80 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(cert.status)}`}>
                              {formatStatus(cert.status)}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {formatStatus(cert.certificationType)}
                            </span>
                          </div>
                          <h3 className="text-white font-medium">{cert.certificationName}</h3>
                          {cert.certifyingBody && (
                            <p className="text-gray-400 text-sm">Certified by: {cert.certifyingBody}</p>
                          )}
                          {cert.property && (
                            <p className="text-gray-400 text-sm">Property: {cert.property.propertyName || cert.property.addressLine1}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Expires</p>
                          <p className={`font-medium ${
                            cert.status === "expired" ? "text-red-400" :
                            cert.status === "expiring_soon" ? "text-yellow-400" :
                            "text-white"
                          }`}>
                            {formatDate(cert.expiryDate)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === "insurance" && (
          <div role="tabpanel" id="panel-insurance" aria-labelledby="tab-insurance">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Insurance Policies</h2>
                <Link
                  href="/compliance/insurance/new"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Add Policy
                </Link>
              </div>

              {/* Required Coverage Check */}
              {insuranceCoverage && (
                <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-white font-medium mb-3">Required Coverage Status</h3>
                  <div className="space-y-2">
                    {insuranceCoverage.map((coverage) => (
                      <div key={coverage.type} className="flex items-center justify-between">
                        <span className="text-gray-300">{coverage.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">
                            ${(coverage.totalCoverage / 1000000).toFixed(1)}M
                            {coverage.requiredCoverage > 0 && ` / $${(coverage.requiredCoverage / 1000000).toFixed(0)}M required`}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            coverage.meetsCoverage ? "bg-green-600 text-white" :
                            coverage.hasCoverage ? "bg-yellow-600 text-black" :
                            "bg-red-600 text-white"
                          }`}>
                            {coverage.meetsCoverage ? "Met" : coverage.hasCoverage ? "Insufficient" : "Missing"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!insurancePolicies ? (
                <LoadingScreen fullScreen={false} message="Loading policies..." />
              ) : insurancePolicies.length === 0 ? (
                <EmptyState
                  title="No insurance policies recorded"
                  description="Add your first insurance policy to track coverage."
                  action={{ label: "+ Add Policy", href: "/compliance/insurance/new" }}
                  icon={
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {insurancePolicies.map((policy) => (
                    <div key={policy._id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(policy.status)}`}>
                              {formatStatus(policy.status)}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {formatStatus(policy.insuranceType)}
                            </span>
                          </div>
                          <h3 className="text-white font-medium">{policy.policyName}</h3>
                          <p className="text-gray-400 text-sm">Insurer: {policy.insurer}</p>
                          <p className="text-gray-400 text-sm">Policy #: {policy.policyNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-teal-500 font-medium">
                            ${(policy.coverageAmount / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-gray-400 text-sm">Expires</p>
                          <p className={`font-medium ${
                            policy.status === "expired" ? "text-red-400" :
                            policy.status === "expiring_soon" ? "text-yellow-400" :
                            "text-white"
                          }`}>
                            {formatDate(policy.endDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <div role="tabpanel" id="panel-complaints" aria-labelledby="tab-complaints" className="space-y-6">
            {/* Complaints Guide */}
            <div className="bg-gray-800 rounded-lg p-4">
              <button
                onClick={() => setExpandedGuide(expandedGuide === "complaints" ? null : "complaints")}
                aria-expanded={expandedGuide === "complaints"}
                aria-controls="guide-complaints"
                className="w-full flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  <span className="text-white font-medium">NDIS Complaints Handling Guide</span>
                </div>
                <span className="text-gray-400" aria-hidden="true">{expandedGuide === "complaints" ? "▼" : "▶"}</span>
              </button>

              {expandedGuide === "complaints" && (
                <div id="guide-complaints" className="mt-4 pt-4 border-t border-gray-700">
                  {/* Document Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">BLS-SOP-001 &middot; Version 2026.1</p>
                      <h3 className="text-white font-semibold">Complaints Management &amp; Resolution</h3>
                    </div>
                    <button
                      onClick={() => setShowSopOverlay(true)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-sm rounded-lg flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      View Full Procedure
                    </button>
                  </div>

                  {/* Key Timeframes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-red-400 font-bold text-xl">24 Hours</p>
                      <p className="text-gray-300 text-sm">Acknowledge receipt</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-yellow-400 font-bold text-xl">21 Days</p>
                      <p className="text-gray-300 text-sm">Resolve where possible</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-yellow-400 font-bold text-xl">7 Years</p>
                      <p className="text-gray-300 text-sm">Retain records</p>
                    </div>
                  </div>

                  {/* 5-Step Resolution Lifecycle */}
                  <div className="mb-4">
                    <h4 className="text-green-300 font-semibold mb-3">5-Step Resolution Lifecycle</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 bg-gray-700/30 rounded-lg p-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-700 text-white text-sm font-bold flex items-center justify-center">1</span>
                        <div>
                          <p className="text-white font-medium text-sm">Receipt &amp; Initial Triage</p>
                          <p className="text-gray-400 text-xs">Log complaint in MySDAManager with date, source, category. Assess if it involves a Reportable Incident.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-gray-700/30 rounded-lg p-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">2</span>
                        <div>
                          <p className="text-white font-medium text-sm">Acknowledgement</p>
                          <p className="text-gray-400 text-xs">Contact complainant within 24 hours via their preferred method. Confirm receipt and outline next steps.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-gray-700/30 rounded-lg p-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-600 text-white text-sm font-bold flex items-center justify-center">3</span>
                        <div>
                          <p className="text-white font-medium text-sm">Investigation</p>
                          <p className="text-gray-400 text-xs">Assign investigator. Review relevant documents, interview involved parties, identify root cause. Offer independent advocacy.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-gray-700/30 rounded-lg p-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center">4</span>
                        <div>
                          <p className="text-white font-medium text-sm">Resolution &amp; Outcome</p>
                          <p className="text-gray-400 text-xs">Determine outcome, implement corrective actions. Communicate resolution to the complainant in writing.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 bg-gray-700/30 rounded-lg p-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-500 text-white text-sm font-bold flex items-center justify-center">5</span>
                        <div>
                          <p className="text-white font-medium text-sm">Closing &amp; Learning</p>
                          <p className="text-gray-400 text-xs">Confirm satisfaction. Identify systemic improvements. Archive complaint record (retain minimum 7 years).</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Alert */}
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <h4 className="text-red-400 font-semibold text-sm mb-1">Mandatory: Reportable Incidents</h4>
                    <p className="text-gray-300 text-sm">
                      If a complaint involves a Reportable Incident, the Director must notify the NDIS Commission within <strong className="text-red-400">24 hours</strong> via the online portal.
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Ref: NDIS (Incident Management and Reportable Incidents) Rules 2018, Section 16
                    </p>
                  </div>

                  {/* Compliance Contacts */}
                  <div className="p-3 bg-gray-700/50 rounded-lg">
                    <h4 className="text-white font-semibold mb-2 text-sm">Compliance Contacts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-400 text-xs uppercase">NDIS Quality &amp; Safeguards Commission</p>
                        <p className="text-white text-sm font-medium">1800 035 544</p>
                        <a href="https://www.ndiscommission.gov.au/participants/complaints" target="_blank" rel="noopener noreferrer" className="text-teal-500 text-xs underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded">www.ndiscommission.gov.au</a>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase">Internal Escalation</p>
                        <p className="text-white text-sm font-medium">Director, Better Living Solutions</p>
                        <p className="text-gray-400 text-xs">For complaints unresolved within 21 days or involving serious safety concerns</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <SOP001Overlay isOpen={showSopOverlay} onClose={() => setShowSopOverlay(false)} />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">Complaints Register</h2>
                <Link
                  href="/compliance/complaints/new"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  + Log Complaint
                </Link>
              </div>

              {!complaintsStats ? (
                <LoadingScreen fullScreen={false} message="Loading complaints..." />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard title="Total Complaints" value={complaintsStats.total} color="blue" />
                  <StatCard title="Under Investigation" value={complaintsStats.byStatus.under_investigation} color="yellow" />
                  <StatCard title="Resolved" value={complaintsStats.byStatus.resolved} color="green" />
                  <StatCard
                    title="Overdue Ack."
                    value={complaintsStats.overdueAcknowledgments}
                    color={complaintsStats.overdueAcknowledgments > 0 ? "red" : "green"}
                  />
                </div>
              )}

              <p className="text-gray-400 text-center py-4">
                <Link
                  href="/compliance/complaints"
                  className="text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                >
                  View full complaints register →
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* NDIS Incidents Tab */}
        {activeTab === "incidents" && (
          <div role="tabpanel" id="panel-incidents" aria-labelledby="tab-incidents" className="space-y-6">
            {/* Incidents Guide */}
            <div className="bg-gray-800 rounded-lg p-4">
              <button
                onClick={() => setExpandedGuide(expandedGuide === "incidents" ? null : "incidents")}
                aria-expanded={expandedGuide === "incidents"}
                aria-controls="guide-incidents"
                className="w-full flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  <span className="text-white font-medium">NDIS Incident Reporting Guide</span>
                </div>
                <span className="text-gray-400" aria-hidden="true">{expandedGuide === "incidents" ? "▼" : "▶"}</span>
              </button>

              {expandedGuide === "incidents" && (
                <div id="guide-incidents" className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-red-300 font-semibold flex items-center gap-2 mb-2">
                        24-Hour Notification Required
                      </h4>
                      <ul className="text-gray-300 text-sm space-y-1 ml-4 list-disc">
                        <li><strong>Death</strong> - Any death while receiving supports</li>
                        <li><strong>Serious injury</strong> - Requiring emergency hospital treatment</li>
                        <li><strong>Abuse or neglect</strong> - Causing serious harm</li>
                        <li><strong>Unlawful sexual/physical contact</strong> - By staff</li>
                        <li><strong>Sexual misconduct</strong> - By staff</li>
                        <li><strong>Unauthorized restrictive practice</strong></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-yellow-300 font-semibold flex items-center gap-2 mb-2">
                        5 Business Day Notification
                      </h4>
                      <ul className="text-gray-300 text-sm space-y-1 ml-4 list-disc">
                        <li><strong>Abuse/neglect concerns</strong> - Suspected</li>
                        <li><strong>Unlawful conduct</strong> - Physical contact</li>
                        <li><strong>Unexplained serious injury</strong></li>
                        <li><strong>Missing participant</strong> - Risk of harm</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">How to Report</h4>
                    <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
                      <li>Log into <a href="https://www.ndiscommission.gov.au/providers/provider-portal" target="_blank" rel="noopener noreferrer" className="text-teal-500 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded">NDIS Commission Provider Portal</a></li>
                      <li>Navigate to &quot;Reportable Incidents&quot;</li>
                      <li>Complete and submit notification</li>
                      <li>Record reference number</li>
                    </ol>
                    <p className="text-gray-400 text-xs mt-2">Phone: 1800 035 544</p>
                  </div>
                  <div className="mt-4 p-3 border border-red-600 rounded-lg" role="alert">
                    <h4 className="text-red-200 font-semibold mb-1">Key Reminders</h4>
                    <ul className="text-gray-300 text-sm">
                      <li>- Timeframes start when you become <strong>aware</strong></li>
                      <li>- All reportable incidents require <strong>60-day follow-up</strong></li>
                      <li>- Keep records for <strong>7 years</strong></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-white">NDIS Reportable Incidents</h2>
                <Link
                  href="/incidents/new"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  + Report Incident
                </Link>
              </div>

              {!incidentStats ? (
                <LoadingScreen fullScreen={false} message="Loading incidents..." />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <StatCard title="Total Reportable" value={incidentStats.ndisReportable.total} color="blue" />
                    <StatCard title="24-Hour" value={incidentStats.ndisReportable.immediate} color="red" />
                    <StatCard title="5-Day" value={incidentStats.ndisReportable.fiveDay} color="yellow" />
                    <StatCard title="Notified" value={incidentStats.ndisReportable.notified} color="green" />
                    <StatCard
                      title="Overdue"
                      value={incidentStats.ndisReportable.overdue}
                      color={incidentStats.ndisReportable.overdue > 0 ? "red" : "green"}
                    />
                  </div>

                  {incidentStats.ndisReportable.overdue > 0 && (
                    <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg mb-6" role="alert">
                      <div className="flex items-center gap-2">
                        <svg className="w-7 h-7 text-red-400 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        <div>
                          <p className="text-red-200 font-semibold">
                            {incidentStats.ndisReportable.overdue} incident{incidentStats.ndisReportable.overdue > 1 ? "s" : ""} overdue for NDIS Commission notification
                          </p>
                          <p className="text-red-300 text-sm">
                            Immediate action required. View incidents and complete notifications.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-gray-400 text-center py-4">
                    <Link
                      href="/incidents"
                      className="text-teal-500 hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                    >
                      View all incidents →
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Emergency & BCP Tab */}
        {activeTab === "emergency" && (
          <div role="tabpanel" id="panel-emergency" aria-labelledby="tab-emergency" className="space-y-6">
            {/* EMP Stats */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Emergency Management Plans</h2>
                <Link href="/compliance/emergency-plans" className="text-teal-400 hover:text-teal-300 text-sm">
                  View All Plans →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Plans" value={empStats?.total ?? 0} color="blue" />
                <StatCard title="Active" value={empStats?.active ?? 0} color="green" />
                <StatCard title="Needs Review" value={empStats?.overdueReview ?? 0} color={empStats?.overdueReview ? "red" : "gray"} />
                <StatCard title="Properties Without Plan" value={empStats?.propertiesWithoutPlan ?? 0} color={empStats?.propertiesWithoutPlan ? "yellow" : "gray"} />
              </div>
            </div>

            {/* BCP Status */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Business Continuity Plan</h2>
                <Link href="/compliance/business-continuity" className="text-teal-400 hover:text-teal-300 text-sm">
                  {bcpStats?.hasActivePlan ? "View Plan →" : "Create Plan →"}
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Status" value={bcpStats?.hasActivePlan ? "Active" : "No Plan"} color={bcpStats?.hasActivePlan ? "green" : "red"} />
                <StatCard title="Version" value={bcpStats?.currentVersion || "N/A"} color="blue" />
                <StatCard title="Last Reviewed" value={bcpStats?.lastReviewDate || "Never"} color="gray" />
                <StatCard title="Next Review" value={bcpStats?.nextReviewDate || "Not Set"} color={bcpStats?.isOverdueReview ? "red" : "gray"} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CompliancePage() {
  return (
    <RequireAuth>
      <ComplianceContent />
    </RequireAuth>
  );
}
