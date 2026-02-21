"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../../components/Header";
import CommunicationsHistory from "../../../../components/CommunicationsHistory";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RequireAuth } from "@/components/RequireAuth";

const ACCESS_LEVELS = [
  { value: "full", label: "Full Access", color: "green" },
  { value: "incidents_only", label: "Incidents Only", color: "red" },
  { value: "maintenance_only", label: "Maintenance Only", color: "yellow" },
  { value: "view_only", label: "View Only", color: "gray" },
] as const;

export default function SILProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as Id<"silProviders">;

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [showLinkUserModal, setShowLinkUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(storedUser);
    setUserId(user.id as Id<"users">);
  }, [router]);

  const provider = useQuery(
    api.silProviders.getFullProviderDetails,
    providerId && userId ? { providerId, userId } : "skip"
  );
  const allUsers = useQuery(
    api.auth.getAllUsers,
    userId ? { userId } : "skip"
  );
  const linkUserToProvider = useMutation(api.silProviders.linkUserToProvider);
  const unlinkUserFromProvider = useMutation(api.silProviders.unlinkUserFromProvider);
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

  // Filter users that can be linked (not already SIL provider or not linked to any provider)
  const availableUsers = (allUsers || []).filter(
    (u) =>
      u.isActive &&
      (u.role !== "sil_provider" || !u.silProviderId) &&
      !(provider?.portalUsers || []).some((pu) => pu._id === u._id)
  );

  const handleLinkUser = async () => {
    if (!selectedUserId || !userId) return;
    setIsSubmitting(true);
    try {
      await linkUserToProvider({
        userId: selectedUserId as Id<"users">,
        silProviderId: providerId,
        adminUserId: userId,
      });
      setShowLinkUserModal(false);
      setSelectedUserId("");
    } catch (error) {
      await alertDialog("Failed to link user to provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkUser = async (userIdToUnlink: Id<"users">) => {
    if (!userId) return;
    if (!(await confirmDialog({ title: "Confirm Remove", message: "Remove this user's access to the SIL provider portal?", variant: "danger" }))) return;
    try {
      await unlinkUserFromProvider({
        userId: userIdToUnlink,
        adminUserId: userId,
      });
    } catch (error) {
      await alertDialog("Failed to remove user access");
    }
  };

  const getAccessBadge = (level: string) => {
    const config = ACCESS_LEVELS.find((a) => a.value === level) || ACCESS_LEVELS[0];
    const colorMap: Record<string, string> = {
      green: "bg-green-600/20 text-green-400",
      red: "bg-red-600/20 text-red-400",
      yellow: "bg-yellow-600/20 text-yellow-400",
      gray: "bg-gray-600/20 text-gray-400",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colorMap[config.color]}`}>
        {config.label}
      </span>
    );
  };

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="database" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="database" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/database" className="text-gray-400 hover:text-white">
                Database
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/database/sil-providers" className="text-gray-400 hover:text-white">
                SIL Providers
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">{provider.companyName}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{provider.companyName}</h1>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  provider.status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {provider.status}
              </span>
              {provider.rating && (
                <div className="flex items-center text-yellow-400">
                  {"★".repeat(provider.rating)}
                  {"☆".repeat(5 - provider.rating)}
                </div>
              )}
            </div>
            {provider.contactName && (
              <p className="text-gray-400 mt-1">Contact: {provider.contactName}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              <a
                href={`mailto:${provider.email}`}
                className="text-teal-500 hover:text-teal-400 text-sm"
              >
                {provider.email}
              </a>
              {provider.phone && (
                <a
                  href={`tel:${provider.phone}`}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  {provider.phone}
                </a>
              )}
            </div>
          </div>
          <Link
            href="/database/sil-providers"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Back to List
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Allocated Dwellings</p>
            <p className="text-2xl font-bold text-white mt-1">
              {provider.allocatedDwellings?.length || 0}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Linked Participants</p>
            <p className="text-2xl font-bold text-white mt-1">
              {provider.linkedParticipants?.length || 0}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Portal Users</p>
            <p className="text-2xl font-bold text-white mt-1">
              {provider.portalUsers?.length || 0}
            </p>
          </div>
        </div>

        {/* Provider Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Company Info</h2>
              <div className="space-y-3">
                {provider.ndisRegistrationNumber && (
                  <div>
                    <p className="text-gray-400 text-sm">NDIS Registration</p>
                    <p className="text-white">{provider.ndisRegistrationNumber}</p>
                  </div>
                )}
                {provider.abn && (
                  <div>
                    <p className="text-gray-400 text-sm">ABN</p>
                    <p className="text-white">{provider.abn}</p>
                  </div>
                )}
                {provider.address && (
                  <div>
                    <p className="text-gray-400 text-sm">Address</p>
                    <p className="text-white">
                      {provider.address}
                      {provider.suburb && `, ${provider.suburb}`}
                      {provider.state && ` ${provider.state}`}
                      {provider.postcode && ` ${provider.postcode}`}
                    </p>
                  </div>
                )}
                {provider.relationship && (
                  <div>
                    <p className="text-gray-400 text-sm">How We Know Them</p>
                    <p className="text-white">{provider.relationship}</p>
                  </div>
                )}
                {provider.notes && (
                  <div>
                    <p className="text-gray-400 text-sm">Notes</p>
                    <p className="text-white text-sm">{provider.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Areas & Services */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Areas & Services</h2>
              {provider.areas && provider.areas.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Areas Covered</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.areas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {provider.services && provider.services.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Services Offered</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.services.map((service) => (
                      <span
                        key={service}
                        className="px-2 py-1 bg-teal-600/20 text-teal-500 text-xs rounded"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Portal Users */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Portal Users</h2>
                <button
                  onClick={() => setShowLinkUserModal(true)}
                  className="text-sm text-teal-500 hover:text-teal-400"
                >
                  + Link User
                </button>
              </div>
              {!provider.portalUsers || provider.portalUsers.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No portal users linked</p>
              ) : (
                <div className="space-y-2">
                  {provider.portalUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded bg-teal-600/20 text-teal-500">
                          Portal Access
                        </span>
                        <button
                          onClick={() => handleUnlinkUser(user._id)}
                          className="p-1 text-gray-400 hover:text-red-400"
                          title="Remove Access"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Allocated Dwellings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Allocated Dwellings</h2>
            {!provider.allocatedDwellings || provider.allocatedDwellings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No dwellings allocated</p>
                <p className="text-gray-400 text-sm mt-1">
                  Allocate dwellings from the property detail page
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {provider.allocatedDwellings.map((allocation) => (
                  <div
                    key={allocation.linkId}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/properties/${allocation.property?._id}`}
                          className="text-white font-medium hover:text-teal-500"
                        >
                          {allocation.dwelling?.dwellingName}
                        </Link>
                        <p className="text-gray-400 text-sm">
                          {allocation.property?.propertyName || allocation.property?.addressLine1}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {allocation.property?.suburb} {allocation.property?.state}
                        </p>
                      </div>
                      {getAccessBadge(allocation.accessLevel)}
                    </div>
                    {allocation.participants && allocation.participants.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-gray-400 text-xs mb-2">Participants:</p>
                        <div className="space-y-1">
                          {allocation.participants.map((p) => (
                            <Link
                              key={p._id}
                              href={`/participants/${p._id}`}
                              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
                            >
                              <span className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center text-xs text-white">
                                {p.firstName[0]}{p.lastName[0]}
                              </span>
                              {p.firstName} {p.lastName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {allocation.startDate && (
                      <p className="text-gray-400 text-xs mt-2">
                        Since: {new Date(allocation.startDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Linked Participants */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Linked Participants</h2>
            <p className="text-gray-400 text-xs mb-4">
              Participants linked via their profile page
            </p>
            {!provider.linkedParticipants || provider.linkedParticipants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No participants linked</p>
                <p className="text-gray-400 text-sm mt-1">
                  Link participants from their detail page
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {provider.linkedParticipants.map((link) => (
                  <div
                    key={link.linkId}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/participants/${link.participant?._id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <span className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center text-white font-medium">
                          {link.participant?.firstName[0]}{link.participant?.lastName[0]}
                        </span>
                        <div>
                          <p className="text-white font-medium">
                            {link.participant?.firstName} {link.participant?.lastName}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {link.property?.propertyName || link.property?.addressLine1 || "No property"}
                          </p>
                        </div>
                      </Link>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          link.relationshipType === "current"
                            ? "bg-green-500/20 text-green-400"
                            : link.relationshipType === "past"
                            ? "bg-gray-500/20 text-gray-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {link.relationshipType}
                      </span>
                    </div>
                    {link.notes && (
                      <p className="text-gray-400 text-xs mt-2 italic">{link.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Communications History */}
        <div className="mt-6">
          <CommunicationsHistory
            stakeholderEntityType="sil_provider"
            stakeholderEntityId={providerId}
          />
        </div>
      </main>

      {/* Link User Modal */}
      {showLinkUserModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLinkUserModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Link User to Provider</h3>
              <button
                onClick={() => setShowLinkUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {availableUsers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400">No available users to link.</p>
                  <p className="text-gray-400 text-sm mt-2">
                    All users are either already linked to a provider or are admins.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-4">
                    Select a user to give them portal access for {provider.companyName}.
                    This will change their role to &quot;SIL Provider&quot;.
                  </p>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value as Id<"users">)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 mb-4"
                  >
                    <option value="">Select a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLinkUserModal(false)}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLinkUser}
                      disabled={!selectedUserId || isSubmitting}
                      className="flex-1 py-2 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {isSubmitting ? "Linking..." : "Link User"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}
