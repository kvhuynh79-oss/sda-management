"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ParticipantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<{ role: string } | null>(null);

  const participantId = params.id as Id<"participants">;
  const participant = useQuery(api.participants.getById, { participantId });
  const documents = useQuery(api.documents.getByParticipant, { participantId });

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

  if (participant === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-gray-400 text-center py-12">Loading participant details...</div>
        </main>
      </div>
    );
  }

  if (participant === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-red-400 text-center py-12">Participant not found</div>
        </main>
      </div>
    );
  }

  const currentPlan = participant.plans?.find((p) => p.planStatus === "current");
  const pastPlans = participant.plans?.filter((p) => p.planStatus !== "current") || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-600",
      inactive: "bg-gray-600",
      pending_move_in: "bg-yellow-600",
      moved_out: "bg-red-600",
    };
    return colors[status] || "bg-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li>
              <Link href="/participants" className="text-gray-400 hover:text-white">
                Participants
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">
              {participant.firstName} {participant.lastName}
            </li>
          </ol>
        </nav>

        {/* Participant Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {participant.firstName} {participant.lastName}
              </h1>
              <p className="text-gray-400 text-lg">NDIS: {participant.ndisNumber}</p>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm text-white ${getStatusColor(
                    participant.status
                  )}`}
                >
                  {participant.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                Edit Participant
              </button>
              {participant.status === "active" && (
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  Move Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Participant Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>
              <div className="space-y-3">
                {participant.dateOfBirth && (
                  <DetailRow label="Date of Birth" value={participant.dateOfBirth} />
                )}
                {participant.email && <DetailRow label="Email" value={participant.email} />}
                {participant.phone && <DetailRow label="Phone" value={participant.phone} />}
              </div>
            </div>

            {/* Current Accommodation */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Current Accommodation</h2>
              <div className="space-y-3">
                {participant.dwelling && (
                  <>
                    <DetailRow label="Dwelling" value={participant.dwelling.dwellingName} />
                    {participant.property && (
                      <DetailRow
                        label="Property"
                        value={`${participant.property.addressLine1}, ${participant.property.suburb}`}
                      />
                    )}
                    <DetailRow label="Move In Date" value={participant.moveInDate} />
                    {participant.property && (
                      <Link
                        href={`/properties/${participant.property._id}`}
                        className="inline-block mt-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        View Property Details →
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {(participant.emergencyContactName ||
              participant.emergencyContactPhone ||
              participant.emergencyContactRelation) && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Emergency Contact</h2>
                <div className="space-y-3">
                  {participant.emergencyContactName && (
                    <DetailRow label="Name" value={participant.emergencyContactName} />
                  )}
                  {participant.emergencyContactPhone && (
                    <DetailRow label="Phone" value={participant.emergencyContactPhone} />
                  )}
                  {participant.emergencyContactRelation && (
                    <DetailRow label="Relationship" value={participant.emergencyContactRelation} />
                  )}
                </div>
              </div>
            )}

            {/* Support Coordination */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Support Services</h2>
              <div className="space-y-4">
                {participant.silProviderName && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">SIL Provider</p>
                    <p className="text-white">{participant.silProviderName}</p>
                  </div>
                )}
                {participant.supportCoordinatorName && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Support Coordinator</p>
                    <p className="text-white">{participant.supportCoordinatorName}</p>
                    {participant.supportCoordinatorEmail && (
                      <p className="text-gray-400 text-sm">{participant.supportCoordinatorEmail}</p>
                    )}
                    {participant.supportCoordinatorPhone && (
                      <p className="text-gray-400 text-sm">{participant.supportCoordinatorPhone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {participant.notes && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{participant.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Plans and Payments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan */}
            {currentPlan ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Current NDIS Plan</h2>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                    CURRENT
                  </span>
                </div>
                <PlanCard plan={currentPlan} />
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Current NDIS Plan</h2>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No current plan on file</p>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    + Add Plan
                  </button>
                </div>
              </div>
            )}

            {/* Plan History */}
            {pastPlans.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Plan History</h2>
                <div className="space-y-4">
                  {pastPlans.map((plan) => (
                    <div key={plan._id} className="border-l-4 border-gray-600 pl-4">
                      <PlanCard plan={plan} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Documents</h2>
                <Link
                  href={`/documents/new?participantId=${participantId}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  + Upload Document
                </Link>
              </div>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <DocumentCard key={doc._id} document={doc} />
                  ))}
                  {documents.length > 5 && (
                    <Link
                      href={`/documents?participantId=${participantId}`}
                      className="block text-center text-blue-400 hover:text-blue-300 text-sm pt-2"
                    >
                      View all {documents.length} documents →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No documents uploaded yet
                </div>
              )}
            </div>

            {/* Payment History */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Payment History</h2>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
                  + Record Payment
                </button>
              </div>
              {participant.payments && participant.payments.length > 0 ? (
                <div className="space-y-3">
                  {participant.payments.slice(0, 5).map((payment) => (
                    <PaymentCard key={payment._id} payment={payment} />
                  ))}
                  {participant.payments.length > 5 && (
                    <p className="text-center text-gray-400 text-sm pt-2">
                      Showing 5 of {participant.payments.length} payments
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No payment records yet
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DocumentCard({ document }: { document: any }) {
  const formatDocType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{document.fileName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
              {formatDocType(document.documentType)}
            </span>
            <span className="text-gray-400 text-sm">
              {formatDate(document.createdAt)}
            </span>
          </div>
        </div>
        {document.downloadUrl && (
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
          >
            View
          </a>
        )}
      </div>
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
              <Link href="/participants" className="text-white font-medium">
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link href="/maintenance" className="text-gray-400 hover:text-white transition-colors">
                Maintenance
              </Link>
              <Link href="/documents" className="text-gray-400 hover:text-white transition-colors">
                Documents
              </Link>
              <Link href="/alerts" className="text-gray-400 hover:text-white transition-colors">
                Alerts
              </Link>
              <Link href="/preventative-schedule" className="text-gray-400 hover:text-white transition-colors">
                Schedule
              </Link>
              <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-white">{value}</p>
    </div>
  );
}

function PlanCard({ plan, compact = false }: { plan: any; compact?: boolean }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      current: "text-green-400",
      expired: "text-red-400",
      pending: "text-yellow-400",
    };
    return colors[status] || "text-gray-400";
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 text-xs">Plan Period</p>
          <p className="text-white text-sm">
            {plan.planStartDate} to {plan.planEndDate}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Status</p>
          <p className={`text-sm font-medium ${getPlanStatusColor(plan.planStatus)}`}>
            {plan.planStatus.toUpperCase()}
          </p>
        </div>
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-500 text-xs">Daily Rate</p>
              <p className="text-white text-sm">{formatCurrency(plan.dailySdaRate)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Annual Budget</p>
              <p className="text-white text-sm">{formatCurrency(plan.annualSdaBudget)}</p>
            </div>
            {plan.reasonableRentContribution && (
              <div>
                <p className="text-gray-500 text-xs">RRC</p>
                <p className="text-white text-sm">
                  {formatCurrency(plan.reasonableRentContribution)}
                  {plan.rentContributionFrequency && (
                    <span className="text-gray-400 text-xs ml-1">
                      / {plan.rentContributionFrequency}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-500 text-xs">Design Category</p>
              <p className="text-white text-sm">{formatCategory(plan.sdaDesignCategory)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Building Type</p>
              <p className="text-white text-sm capitalize">
                {plan.sdaBuildingType.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
            <div>
              <p className="text-gray-500 text-xs">Funding Management</p>
              <p className="text-white text-sm capitalize">
                {plan.fundingManagementType.replace(/_/g, " ")}
              </p>
            </div>
            {plan.planManagerName && (
              <div>
                <p className="text-gray-500 text-xs">Plan Manager</p>
                <p className="text-white text-sm">{plan.planManagerName}</p>
                {plan.planManagerEmail && (
                  <p className="text-gray-400 text-xs">{plan.planManagerEmail}</p>
                )}
              </div>
            )}
          </div>

          {plan.notes && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-500 text-xs mb-1">Notes</p>
              <p className="text-gray-300 text-sm">{plan.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaymentCard({ payment }: { payment: any }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return "text-gray-400";
    if (variance > 0) return "text-green-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-white font-medium">{payment.paymentDate}</p>
          <p className="text-gray-400 text-sm">
            Period: {payment.paymentPeriodStart} to {payment.paymentPeriodEnd}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-medium">{formatCurrency(payment.actualAmount)}</p>
          <p className={`text-sm ${getVarianceColor(payment.variance)}`}>
            {payment.variance === 0
              ? "On target"
              : `${payment.variance > 0 ? "+" : ""}${formatCurrency(payment.variance)}`}
          </p>
        </div>
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="capitalize">{payment.paymentSource.replace(/_/g, " ")}</span>
        {payment.paymentReference && <span>Ref: {payment.paymentReference}</span>}
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
