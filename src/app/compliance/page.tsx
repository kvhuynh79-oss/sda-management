"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function CompliancePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "certifications" | "insurance" | "complaints" | "incidents">("overview");

  const certifications = useQuery(api.complianceCertifications.getAll, {});
  const expiringSoonCerts = useQuery(api.complianceCertifications.getExpiringSoon);
  const insurancePolicies = useQuery(api.insurancePolicies.getAll, {});
  const insuranceCoverage = useQuery(api.insurancePolicies.checkRequiredCoverage);
  const complaintsStats = useQuery(api.complaints.getStats);
  const incidentStats = useQuery(api.incidents.getStats);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      current: "bg-green-600",
      expiring_soon: "bg-yellow-600",
      expired: "bg-red-600",
      pending_renewal: "bg-orange-600",
    };
    return colors[status] || "bg-gray-600";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Calculate overall compliance score
  const calculateComplianceScore = () => {
    let score = 100;
    let issues = 0;

    // Check certifications
    if (certifications) {
      const expired = certifications.filter(c => c.status === "expired").length;
      const expiringSoon = certifications.filter(c => c.status === "expiring_soon").length;
      score -= expired * 15;
      score -= expiringSoon * 5;
      issues += expired + expiringSoon;
    }

    // Check insurance
    if (insuranceCoverage) {
      const missing = insuranceCoverage.filter(c => !c.hasCoverage).length;
      const insufficient = insuranceCoverage.filter(c => c.hasCoverage && !c.meetsCoverage).length;
      score -= missing * 20;
      score -= insufficient * 10;
      issues += missing + insufficient;
    }

    // Check incidents
    if (incidentStats?.ndisReportable) {
      score -= incidentStats.ndisReportable.overdue * 25;
      issues += incidentStats.ndisReportable.overdue;
    }

    // Check complaints
    if (complaintsStats) {
      score -= complaintsStats.overdueAcknowledgments * 10;
      issues += complaintsStats.overdueAcknowledgments;
    }

    return { score: Math.max(0, score), issues };
  };

  const compliance = calculateComplianceScore();

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="reports" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor NDIS compliance, certifications, and insurance</p>
        </div>

        {/* Compliance Score Banner */}
        <div className={`rounded-lg p-6 mb-6 ${
          compliance.score >= 80 ? "bg-green-900/30 border border-green-600" :
          compliance.score >= 60 ? "bg-yellow-900/30 border border-yellow-600" :
          "bg-red-900/30 border border-red-600"
        }`}>
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview" },
            { id: "certifications", label: "Certifications" },
            { id: "insurance", label: "Insurance" },
            { id: "complaints", label: "Complaints" },
            { id: "incidents", label: "NDIS Incidents" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Certifications Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Certifications</h3>
              {certifications === undefined ? (
                <p className="text-gray-400">Loading...</p>
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
                  <button
                    onClick={() => setActiveTab("certifications")}
                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View all certifications →
                  </button>
                </>
              )}
            </div>

            {/* Insurance Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Insurance Coverage</h3>
              {insuranceCoverage === undefined ? (
                <p className="text-gray-400">Loading...</p>
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
                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View all policies →
                  </button>
                </>
              )}
            </div>

            {/* Complaints Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Complaints</h3>
              {complaintsStats === undefined ? (
                <p className="text-gray-400">Loading...</p>
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
                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View all complaints →
                  </button>
                </>
              )}
            </div>

            {/* NDIS Incidents Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">NDIS Reportable</h3>
              {incidentStats === undefined ? (
                <p className="text-gray-400">Loading...</p>
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
                    className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View reportable incidents →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === "certifications" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Compliance Certifications</h2>
              <Link
                href="/compliance/certifications/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                + Add Certification
              </Link>
            </div>

            {certifications === undefined ? (
              <p className="text-gray-400">Loading...</p>
            ) : certifications.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No certifications recorded yet</p>
            ) : (
              <div className="space-y-4">
                {certifications.map((cert) => (
                  <div key={cert._id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(cert.status)}`}>
                            {cert.status.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {cert.certificationType.replace(/_/g, " ").toUpperCase()}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insurance Tab */}
        {activeTab === "insurance" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Insurance Policies</h2>
              <Link
                href="/compliance/insurance/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
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

            {insurancePolicies === undefined ? (
              <p className="text-gray-400">Loading...</p>
            ) : insurancePolicies.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No insurance policies recorded yet</p>
            ) : (
              <div className="space-y-4">
                {insurancePolicies.map((policy) => (
                  <div key={policy._id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(policy.status)}`}>
                            {policy.status.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {policy.insuranceType.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-white font-medium">{policy.policyName}</h3>
                        <p className="text-gray-400 text-sm">Insurer: {policy.insurer}</p>
                        <p className="text-gray-400 text-sm">Policy #: {policy.policyNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 font-medium">
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
        )}

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Complaints Register</h2>
              <Link
                href="/compliance/complaints/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                + Log Complaint
              </Link>
            </div>

            {complaintsStats === undefined ? (
              <p className="text-gray-400">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{complaintsStats.total}</p>
                  <p className="text-gray-400 text-sm">Total Complaints</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{complaintsStats.byStatus.under_investigation}</p>
                  <p className="text-gray-400 text-sm">Under Investigation</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{complaintsStats.byStatus.resolved}</p>
                  <p className="text-gray-400 text-sm">Resolved</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className={`text-2xl font-bold ${complaintsStats.overdueAcknowledgments > 0 ? "text-red-400" : "text-green-400"}`}>
                    {complaintsStats.overdueAcknowledgments}
                  </p>
                  <p className="text-gray-400 text-sm">Overdue Ack.</p>
                </div>
              </div>
            )}

            <p className="text-gray-400 text-center py-4">
              <Link href="/compliance/complaints" className="text-blue-400 hover:text-blue-300">
                View full complaints register →
              </Link>
            </p>
          </div>
        )}

        {/* NDIS Incidents Tab */}
        {activeTab === "incidents" && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">NDIS Reportable Incidents</h2>
              <Link
                href="/incidents/new"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                + Report Incident
              </Link>
            </div>

            {incidentStats === undefined ? (
              <p className="text-gray-400">Loading...</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-white">{incidentStats.ndisReportable.total}</p>
                    <p className="text-gray-400 text-sm">Total Reportable</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{incidentStats.ndisReportable.immediate}</p>
                    <p className="text-gray-400 text-sm">24-Hour</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-orange-400">{incidentStats.ndisReportable.fiveDay}</p>
                    <p className="text-gray-400 text-sm">5-Day</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{incidentStats.ndisReportable.notified}</p>
                    <p className="text-gray-400 text-sm">Notified</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className={`text-2xl font-bold ${incidentStats.ndisReportable.overdue > 0 ? "text-red-400 animate-pulse" : "text-green-400"}`}>
                      {incidentStats.ndisReportable.overdue}
                    </p>
                    <p className="text-gray-400 text-sm">Overdue</p>
                  </div>
                </div>

                {incidentStats.ndisReportable.overdue > 0 && (
                  <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🚨</span>
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
                  <Link href="/incidents" className="text-blue-400 hover:text-blue-300">
                    View all incidents →
                  </Link>
                </p>
              </>
            )}
          </div>
        )}
      </main>
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
