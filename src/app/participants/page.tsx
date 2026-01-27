"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ParticipantsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const participants = useQuery(api.participants.getAll);

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

  // Filter participants
  const filteredParticipants = participants?.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ndisNumber.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Participants</h2>
            <p className="text-gray-400 mt-1">Manage NDIS participants and their plans</p>
          </div>
          <Link
            href="/participants/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Add Participant
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or NDIS number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_move_in">Pending Move-in</option>
            </select>
          </div>
        </div>

        {/* Participants List */}
        {participants === undefined ? (
          <div className="text-gray-400 text-center py-12">Loading participants...</div>
        ) : filteredParticipants?.length === 0 ? (
          <EmptyState hasFilters={searchTerm !== "" || statusFilter !== "all"} />
        ) : (
          <div className="grid gap-4">
            {filteredParticipants?.map((participant) => (
              <ParticipantCard key={participant._id} participant={participant} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);

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
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-300">{user.firstName} {user.lastName}</span>
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

function ParticipantCard({ participant }: { participant: any }) {
  const getStatusColor = () => {
    switch (participant.status) {
      case "active": return "bg-green-600";
      case "inactive": return "bg-gray-600";
      case "pending_move_in": return "bg-yellow-600";
      default: return "bg-gray-600";
    }
  };

  const getPlanStatus = () => {
    if (!participant.currentPlan) return { text: "No Plan", color: "text-red-400" };
    
    const endDate = new Date(participant.currentPlan.planEndDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { text: "Plan Expired", color: "text-red-400" };
    if (daysLeft <= 30) return { text: `Expires in ${daysLeft} days`, color: "text-yellow-400" };
    if (daysLeft <= 60) return { text: `Expires in ${daysLeft} days`, color: "text-orange-400" };
    return { text: "Plan Active", color: "text-green-400" };
  };

  const planStatus = getPlanStatus();

  const formatFundingType = (type: string) => {
    switch (type) {
      case "ndia_managed": return "NDIA Managed";
      case "plan_managed": return "Plan Managed";
      case "self_managed": return "Self Managed";
      default: return type;
    }
  };

  return (
    <Link href={`/participants/${participant._id}`}>
      <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700 hover:border-gray-600">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {participant.firstName[0]}{participant.lastName[0]}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white">
                {participant.firstName} {participant.lastName}
              </h3>
              <p className="text-gray-400 text-sm">
                NDIS: {participant.ndisNumber}
              </p>
              {participant.property && (
                <p className="text-gray-500 text-sm mt-1">
                  {participant.dwelling?.dwellingName} at {participant.property.propertyName || participant.property.addressLine1}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm ${planStatus.color}`}>
              {planStatus.text}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs text-white ${getStatusColor()}`}>
              {participant.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {participant.currentPlan && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-4 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Funding Type</p>
              <p className="text-white text-sm">
                {formatFundingType(participant.currentPlan.fundingManagementType)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Daily Rate</p>
              <p className="text-white text-sm">
                ${participant.currentPlan.dailySdaRate.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Annual Budget</p>
              <p className="text-white text-sm">
                ${participant.currentPlan.annualSdaBudget.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Plan End</p>
              <p className="text-white text-sm">
                {new Date(participant.currentPlan.planEndDate).toLocaleDateString("en-AU")}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-12 text-center">
      <div className="text-gray-500 text-6xl mb-4">👤</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? "No participants match your filters" : "No participants yet"}
      </h3>
      <p className="text-gray-400 mb-6">
        {hasFilters 
          ? "Try adjusting your search or filters"
          : "Get started by adding your first NDIS participant"}
      </p>
      {!hasFilters && (
        <Link
          href="/participants/new"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Your First Participant
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
