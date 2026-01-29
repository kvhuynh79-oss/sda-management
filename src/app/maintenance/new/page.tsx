"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";
import { Id } from "../../../../convex/_generated/dataModel";

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  const properties = useQuery(api.properties.getAll);
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyId ? { propertyId: selectedPropertyId as Id<"properties"> } : "skip"
  );
  const createRequest = useMutation(api.maintenanceRequests.create);

  const [formData, setFormData] = useState({
    propertyId: "",
    dwellingId: "",
    requestType: "reactive" as "reactive" | "preventative",
    category: "general" as
      | "plumbing"
      | "electrical"
      | "appliances"
      | "building"
      | "grounds"
      | "safety"
      | "general",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
    title: "",
    description: "",
    reportedBy: "",
    reportedDate: new Date().toISOString().split("T")[0],
    contractorName: "",
    contractorContact: "",
    quotedAmount: "",
    notes: "",
  });

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [availableDwellings, setAvailableDwellings] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (formData.propertyId && properties) {
      const property = properties.find((p) => p._id === formData.propertyId);
      setSelectedProperty(property || null);
    }
  }, [formData.propertyId, properties]);

  useEffect(() => {
    if (dwellings) {
      setAvailableDwellings(dwellings);
    }
  }, [dwellings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("User not authenticated");
      return;
    }

    if (!formData.dwellingId) {
      setError("Please select a property and dwelling");
      return;
    }

    if (!formData.title || !formData.description) {
      setError("Please enter a title and description");
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest({
        dwellingId: formData.dwellingId as Id<"dwellings">,
        requestType: formData.requestType,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        reportedBy: formData.reportedBy || undefined,
        reportedDate: formData.reportedDate,
        contractorName: formData.contractorName || undefined,
        contractorContact: formData.contractorContact || undefined,
        quotedAmount: formData.quotedAmount ? parseFloat(formData.quotedAmount) : undefined,
        notes: formData.notes || undefined,
        createdBy: user.id as Id<"users">,
      });

      router.push("/maintenance");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create maintenance request");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "border-red-600 bg-red-600/10",
      high: "border-orange-600 bg-orange-600/10",
      medium: "border-yellow-600 bg-yellow-600/10",
      low: "border-gray-600 bg-gray-600/10",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Link href="/maintenance" className="text-gray-400 hover:text-white">
                Maintenance
              </Link>
            </li>
            <li className="text-gray-600">/</li>
            <li className="text-white">New Request</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Log Maintenance Request</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property & Dwelling Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Property *
                </label>
                <select
                  required
                  value={formData.propertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setFormData({ ...formData, propertyId: e.target.value, dwellingId: "" });
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a property</option>
                  {properties?.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.propertyName || property.addressLine1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dwelling *
                </label>
                <select
                  required
                  value={formData.dwellingId}
                  onChange={(e) => setFormData({ ...formData, dwellingId: e.target.value })}
                  disabled={!formData.propertyId}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">
                    {formData.propertyId ? "Select a dwelling" : "Select property first"}
                  </option>
                  {availableDwellings.map((dwelling) => (
                    <option key={dwelling._id} value={dwelling._id}>
                      {dwelling.dwellingName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Type & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Request Type *
                </label>
                <select
                  required
                  value={formData.requestType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requestType: e.target.value as "reactive" | "preventative",
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reactive">Reactive (Issue/Problem)</option>
                  <option value="preventative">Preventative (Scheduled)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="appliances">Appliances</option>
                  <option value="building">Building/Structure</option>
                  <option value="grounds">Grounds/Exterior</option>
                  <option value="safety">Safety/Compliance</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Priority *</label>
              <div className="grid grid-cols-4 gap-3">
                {(["urgent", "high", "medium", "low"] as const).map((priority) => (
                  <label
                    key={priority}
                    className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                      formData.priority === priority
                        ? getPriorityColor(priority)
                        : "border-gray-700 bg-gray-700/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority}
                      checked={formData.priority === priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="sr-only"
                    />
                    <span className="text-white font-medium capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue or task"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Detailed description of the issue, symptoms, or work required..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reported By & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reported By
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  placeholder="Name of person reporting (optional)"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reported Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.reportedDate}
                  onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contractor Details */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contractor Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contractor Name
                  </label>
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contractor Contact
                  </label>
                  <input
                    type="text"
                    value={formData.contractorContact}
                    onChange={(e) =>
                      setFormData({ ...formData, contractorContact: e.target.value })
                    }
                    placeholder="Phone or email"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quoted Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quotedAmount}
                  onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any other relevant information..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? "Creating Request..." : "Create Maintenance Request"}
              </button>
              <Link
                href="/maintenance"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
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
            <Link href="/dashboard">
              <Image
                src="/Logo.jpg"
                alt="Better Living Solutions"
                width={140}
                height={40}
                className="rounded"
              />
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
              <Link href="/participants" className="text-gray-400 hover:text-white transition-colors">
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link href="/maintenance" className="text-white font-medium">
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
