"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/utils/format";

const STATUS_BADGES: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  under_review: "bg-yellow-500/20 text-yellow-400",
  expired: "bg-red-500/20 text-red-400",
  ceased: "bg-gray-500/20 text-gray-400",
};

const TYPE_LABELS: Record<string, string> = {
  environmental: "Environmental",
  chemical: "Chemical",
  mechanical: "Mechanical",
  physical: "Physical",
  seclusion: "Seclusion",
};

export default function RestrictivePracticeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const practiceId = params.id as Id<"restrictivePractices">;
  const { confirm: confirmDialog } = useConfirmDialog();

  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [showNdisForm, setShowNdisForm] = useState(false);
  const [ndisDate, setNdisDate] = useState(new Date().toISOString().split("T")[0]);
  const [ndisRef, setNdisRef] = useState("");

  const userId = user ? (user.id as Id<"users">) : undefined;
  const practice = useQuery(api.restrictivePractices.getById, userId ? { id: practiceId, userId } : "skip");
  const incidents = useQuery(api.restrictivePractices.getIncidents, userId ? { restrictivePracticeId: practiceId, userId } : "skip");
  const updatePractice = useMutation(api.restrictivePractices.update);
  const removePractice = useMutation(api.restrictivePractices.remove);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  if (!user) return null;
  if (!practice) return <LoadingScreen />;

  const today = new Date().toISOString().split("T")[0];
  const isOverdueReview = practice.nextReviewDate ? practice.nextReviewDate < today : false;
  const isAuthExpiring = practice.authorisationExpiry ? practice.authorisationExpiry <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : false;

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: "Delete Restrictive Practice",
      message: "Are you sure you want to delete this restrictive practice record? This action will soft-delete the record.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (confirmed) {
      await removePractice({ id: practiceId, userId: user.id as Id<"users"> });
      router.push("/restrictive-practices");
    }
  };

  const handleNdisReport = async () => {
    if (!ndisDate) return;
    await updatePractice({
      id: practiceId,
      userId: user.id as Id<"users">,
      ndisReportedDate: ndisDate,
      ndisReferenceNumber: ndisRef || undefined,
    });
    setShowNdisForm(false);
  };

  const handleCease = async () => {
    const confirmed = await confirmDialog({
      title: "Cease Restrictive Practice",
      message: "Mark this restrictive practice as ceased? This indicates the practice is no longer in use.",
      confirmLabel: "Cease Practice",
    });
    if (confirmed) {
      await updatePractice({
        id: practiceId,
        userId: user.id as Id<"users">,
        status: "ceased",
        endDate: today,
      });
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="compliance" />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <Link href="/restrictive-practices" className="text-teal-400 hover:text-teal-300 text-sm mb-4 inline-block">
            &larr; Back to Register
          </Link>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGES[practice.status]}`}>
                  {practice.status.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                  {TYPE_LABELS[practice.practiceType]}
                </span>
                {!practice.isAuthorised && (
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-600/30 text-red-300">
                    UNAUTHORISED
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{practice.participantName}</h1>
              <p className="text-gray-400">{practice.propertyAddress}</p>
            </div>
            <div className="flex gap-2">
              {practice.status === "active" && (
                <>
                  <Link
                    href={`/restrictive-practices/${practiceId}/incident`}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Log Incident
                  </Link>
                  <Link
                    href={`/restrictive-practices/${practiceId}/review`}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Conduct Review
                  </Link>
                  <button
                    onClick={handleCease}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Cease Practice
                  </button>
                </>
              )}
              {(user.role === "admin" || user.role === "property_manager") && (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Alerts */}
          {isOverdueReview && practice.status === "active" && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-medium">Review Overdue — Next review was due {formatDate(practice.nextReviewDate)}</p>
            </div>
          )}
          {!practice.isAuthorised && practice.status === "active" && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-medium">UNAUTHORISED — This practice has no valid authorisation. This must be reported to the NDIS Commission immediately.</p>
            </div>
          )}
          {practice.ndisReportable && !practice.ndisReportedDate && (
            <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-orange-400 font-medium">NDIS Reportable — This practice must be reported to the NDIS Commission</p>
                <button
                  onClick={() => setShowNdisForm(true)}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                >
                  Record Report
                </button>
              </div>
              {showNdisForm && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="date" value={ndisDate} onChange={(e) => setNdisDate(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <input type="text" value={ndisRef} onChange={(e) => setNdisRef(e.target.value)} placeholder="NDIS Reference #" className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={handleNdisReport} className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors">Save</button>
                </div>
              )}
            </div>
          )}

          {/* Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Practice Details */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Practice Details</h2>
              <dl className="space-y-3">
                <div><dt className="text-sm text-gray-400">Description</dt><dd className="text-white mt-0.5">{practice.description}</dd></div>
                <div><dt className="text-sm text-gray-400">Reduction Strategy</dt><dd className="text-white mt-0.5">{practice.reductionStrategy}</dd></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><dt className="text-sm text-gray-400">Start Date</dt><dd className="text-white">{formatDate(practice.startDate)}</dd></div>
                  <div><dt className="text-sm text-gray-400">End Date</dt><dd className="text-white">{practice.endDate ? formatDate(practice.endDate) : "Ongoing"}</dd></div>
                </div>
                {practice.implementerName && (
                  <div><dt className="text-sm text-gray-400">Implemented By</dt><dd className="text-white">{practice.implementerName}</dd></div>
                )}
                <div><dt className="text-sm text-gray-400">Created By</dt><dd className="text-white">{practice.creatorName} on {formatDate(new Date(practice.createdAt).toISOString().split("T")[0])}</dd></div>
              </dl>
            </div>

            {/* Authorisation & Review */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Authorisation &amp; Review</h2>
              <dl className="space-y-3">
                <div><dt className="text-sm text-gray-400">Authorised By</dt><dd className="text-white">{practice.authorisedBy}</dd></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><dt className="text-sm text-gray-400">Auth. Date</dt><dd className="text-white">{formatDate(practice.authorisationDate)}</dd></div>
                  <div><dt className="text-sm text-gray-400">Auth. Expiry</dt><dd className={`${isAuthExpiring ? "text-yellow-400" : "text-white"}`}>{formatDate(practice.authorisationExpiry)}</dd></div>
                </div>
                {practice.behaviourSupportPlanId && (
                  <div><dt className="text-sm text-gray-400">BSP Reference</dt><dd className="text-white">{practice.behaviourSupportPlanId}</dd></div>
                )}
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><dt className="text-sm text-gray-400">Review Frequency</dt><dd className="text-white capitalize">{practice.reviewFrequency.replace("_", " ")}</dd></div>
                    <div>
                      <dt className="text-sm text-gray-400">Next Review</dt>
                      <dd className={`${isOverdueReview ? "text-red-400 font-medium" : "text-white"}`}>
                        {formatDate(practice.nextReviewDate)}
                      </dd>
                    </div>
                  </div>
                  {practice.lastReviewDate && (
                    <div className="mt-2"><dt className="text-sm text-gray-400">Last Review</dt><dd className="text-white">{formatDate(practice.lastReviewDate)}</dd></div>
                  )}
                  {practice.reviewNotes && (
                    <div className="mt-2"><dt className="text-sm text-gray-400">Review Notes</dt><dd className="text-white">{practice.reviewNotes}</dd></div>
                  )}
                </div>
                {/* NDIS Reporting */}
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div><dt className="text-sm text-gray-400">NDIS Reportable</dt><dd className="text-white">{practice.ndisReportable ? "Yes" : "No"}</dd></div>
                  {practice.ndisReportedDate && (
                    <>
                      <div className="mt-2"><dt className="text-sm text-gray-400">Reported Date</dt><dd className="text-green-400">{formatDate(practice.ndisReportedDate)}</dd></div>
                      {practice.ndisReferenceNumber && (
                        <div className="mt-2"><dt className="text-sm text-gray-400">Reference #</dt><dd className="text-white">{practice.ndisReferenceNumber}</dd></div>
                      )}
                    </>
                  )}
                </div>
              </dl>
            </div>
          </div>

          {/* Incident History */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Incident History</h2>
              {practice.status === "active" && (
                <Link
                  href={`/restrictive-practices/${practiceId}/incident`}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                >
                  Log Incident
                </Link>
              )}
            </div>
            {!incidents || incidents.length === 0 ? (
              <p className="text-gray-400 text-sm">No incidents recorded for this practice.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div key={inc._id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{formatDate(inc.date)} at {inc.time}</span>
                          <span className="text-gray-400 text-sm">({inc.duration} min)</span>
                          {inc.injuries && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-600/30 text-red-300">Injuries</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300"><span className="text-gray-500">Trigger:</span> {inc.trigger}</p>
                        <p className="text-sm text-gray-300"><span className="text-gray-500">Response:</span> {inc.participantResponse}</p>
                        <p className="text-sm text-gray-300"><span className="text-gray-500">Debrief:</span> {inc.debrief}</p>
                        {inc.injuryDetails && (
                          <p className="text-sm text-red-400 mt-1"><span className="text-gray-500">Injury Details:</span> {inc.injuryDetails}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-400">
                        <div>{inc.implementerName}</div>
                        {inc.witnessedBy && <div className="text-xs">Witness: {inc.witnessedBy}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
