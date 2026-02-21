"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { Id } from "../../../../convex/_generated/dataModel";

interface PendingPhoto {
  file: File;
  preview: string;
  description: string;
  photoType: "before" | "during" | "after" | "issue";
}

function NewMaintenanceRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [prefilledFromIncident, setPrefilledFromIncident] = useState(false);

  const properties = useQuery(api.properties.getAll, user ? { userId: user.id as Id<"users"> } : "skip");
  const dwellings = useQuery(
    api.dwellings.getByProperty,
    selectedPropertyId && user ? { propertyId: selectedPropertyId as Id<"properties">, userId: user.id as Id<"users"> } : "skip"
  );
  const createRequest = useMutation(api.maintenanceRequests.create);
  const generateUploadUrl = useMutation(api.maintenancePhotos.generateUploadUrl);
  const addPhoto = useMutation(api.maintenancePhotos.addPhoto);
  const linkMaintenanceRequest = useMutation(api.incidentActions.linkMaintenanceRequest);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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
    // N5: Maintenance vs SDA Modification categorisation
    maintenanceCategory: "routine_maintenance" as
      | "routine_maintenance"
      | "emergency_repair"
      | "sda_modification"
      | "cosmetic"
      | "compliance_upgrade",
    sdaImpactAssessment: "",
    affectsDesignCategory: false,
    requiresAssessorReview: false,
  });

  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [availableDwellings, setAvailableDwellings] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    const userId = parsed.id || parsed._id;

    // If user ID is missing, clear session and redirect to login
    if (!userId) {
      localStorage.removeItem("sda_user");
      router.push("/login");
      return;
    }

    setUser({
      id: userId,
      role: parsed.role,
    });
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

  // Pre-fill from URL params (e.g., when coming from an incident or action)
  useEffect(() => {
    if (prefilledFromIncident) return; // Only prefill once

    const incidentId = searchParams.get("incidentId");
    const incidentActionId = searchParams.get("incidentActionId");
    const propertyId = searchParams.get("propertyId");
    const dwellingId = searchParams.get("dwellingId");
    const title = searchParams.get("title");
    const description = searchParams.get("description");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");

    if (incidentId || incidentActionId || propertyId || title) {
      setFormData((prev) => ({
        ...prev,
        propertyId: propertyId || prev.propertyId,
        dwellingId: dwellingId || prev.dwellingId,
        title: title || prev.title,
        description: description || prev.description,
        category: (category as any) || prev.category,
        priority: (priority as any) || prev.priority,
      }));

      if (propertyId) {
        setSelectedPropertyId(propertyId);
      }

      setPrefilledFromIncident(true);
    }
  }, [searchParams, prefilledFromIncident]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PendingPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          description: "",
          photoType: "issue",
        });
      }
    }
    setPendingPhotos([...pendingPhotos, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...pendingPhotos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPendingPhotos(newPhotos);
  };

  const updatePhotoDescription = (index: number, description: string) => {
    const newPhotos = [...pendingPhotos];
    newPhotos[index].description = description;
    setPendingPhotos(newPhotos);
  };

  const updatePhotoType = (index: number, photoType: PendingPhoto["photoType"]) => {
    const newPhotos = [...pendingPhotos];
    newPhotos[index].photoType = photoType;
    setPendingPhotos(newPhotos);
  };

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
      const incidentActionId = searchParams.get("incidentActionId");

      const requestId = await createRequest({
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
        incidentId: searchParams.get("incidentId") ? searchParams.get("incidentId") as Id<"incidents"> : undefined,
        incidentActionId: incidentActionId ? incidentActionId as Id<"incidentActions"> : undefined,
        // N5: Maintenance categorisation
        maintenanceCategory: formData.maintenanceCategory,
        sdaImpactAssessment: formData.maintenanceCategory === "sda_modification" ? (formData.sdaImpactAssessment || undefined) : undefined,
        affectsDesignCategory: formData.maintenanceCategory === "sda_modification" ? formData.affectsDesignCategory : undefined,
        requiresAssessorReview: formData.maintenanceCategory === "sda_modification" ? formData.requiresAssessorReview : undefined,
        createdBy: user.id as Id<"users">,
      });

      // Link the maintenance request to the incident action if applicable
      if (incidentActionId) {
        try {
          await linkMaintenanceRequest({
            userId: user!.id as Id<"users">,
            actionId: incidentActionId as Id<"incidentActions">,
            maintenanceRequestId: requestId,
          });
        } catch (linkErr) {
        }
      }

      // Upload photos if any
      if (pendingPhotos.length > 0) {
        setUploadingPhotos(true);
        for (const photo of pendingPhotos) {
          try {
            const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });
            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": photo.file.type },
              body: photo.file,
            });
            const { storageId } = await response.json();

            await addPhoto({
              maintenanceRequestId: requestId,
              storageId: storageId as Id<"_storage">,
              fileName: photo.file.name,
              fileSize: photo.file.size,
              fileType: photo.file.type,
              description: photo.description || undefined,
              photoType: photo.photoType,
              uploadedBy: user.id as Id<"users">,
            });
          } catch (photoErr) {
          }
        }
        setUploadingPhotos(false);
      }

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
      <Header currentPage="maintenance" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Link href="/maintenance" className="text-gray-400 hover:text-white">
                Maintenance
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white">New Request</li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Log Maintenance Request</h1>

          {searchParams.get("incidentId") && (
            <div className="mb-6 p-4 bg-purple-900/50 border border-purple-600 rounded-lg text-purple-200">
              <p className="font-medium">Creating from Incident</p>
              <p className="text-sm text-purple-300">
                This maintenance request will be linked to the incident. The form has been pre-filled with relevant details.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property & Dwelling Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={formData.propertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setFormData({ ...formData, propertyId: e.target.value, dwellingId: "" });
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dwelling *
                </label>
                <select
                  required
                  value={formData.dwellingId}
                  onChange={(e) => setFormData({ ...formData, dwellingId: e.target.value })}
                  disabled={!formData.propertyId}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:opacity-50"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                >
                  <option value="reactive">Reactive (Issue/Problem)</option>
                  <option value="preventative">Preventative (Scheduled)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
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

            {/* N5: Maintenance Classification */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Maintenance Classification *
                <span className="ml-1 text-gray-500 text-xs font-normal" title="Categorise whether this is routine maintenance, an SDA modification, or other type">(?)</span>
              </label>
              <select
                required
                value={formData.maintenanceCategory}
                onChange={(e) => setFormData({ ...formData, maintenanceCategory: e.target.value as any })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              >
                <option value="routine_maintenance">Routine Maintenance</option>
                <option value="emergency_repair">Emergency Repair</option>
                <option value="sda_modification">SDA Modification</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="compliance_upgrade">Compliance Upgrade</option>
              </select>
            </div>

            {/* SDA Modification conditional fields */}
            {formData.maintenanceCategory === "sda_modification" && (
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  <p className="text-yellow-300/80 text-sm">
                    SDA modifications may affect the property&apos;s design category and require assessor review before work can proceed. Admin approval is required.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Impact Assessment</label>
                  <textarea
                    value={formData.sdaImpactAssessment}
                    onChange={(e) => setFormData({ ...formData, sdaImpactAssessment: e.target.value })}
                    rows={3}
                    placeholder="Describe how this modification impacts the SDA property..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.affectsDesignCategory}
                      onChange={(e) => setFormData({ ...formData, affectsDesignCategory: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-300">Affects SDA Design Category</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresAssessorReview}
                      onChange={(e) => setFormData({ ...formData, requiresAssessorReview: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-600 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-300">Requires Assessor Review</span>
                  </label>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Priority *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue or task"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Detailed description of the issue, symptoms, or work required..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            {/* Reported By & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reported By
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  placeholder="Name of person reporting (optional)"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reported Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.reportedDate}
                  onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contractor Details */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contractor Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contractor Name
                  </label>
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contractor Contact
                  </label>
                  <input
                    type="text"
                    value={formData.contractorContact}
                    onChange={(e) =>
                      setFormData({ ...formData, contractorContact: e.target.value })
                    }
                    placeholder="Phone or email"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Quoted Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quotedAmount}
                  onChange={(e) => setFormData({ ...formData, quotedAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Any other relevant information..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>

            {/* Photo Upload */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Photos</h3>
              <p className="text-gray-400 text-sm mb-4">
                Upload photos of the issue or work area (optional)
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mb-4"
              >
                + Add Photos
              </button>

              {pendingPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {pendingPhotos.map((photo, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3">
                      <div className="relative aspect-video mb-2">
                        <img
                          src={photo.preview}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm"
                        >
                          X
                        </button>
                      </div>
                      <select
                        value={photo.photoType}
                        onChange={(e) =>
                          updatePhotoType(index, e.target.value as PendingPhoto["photoType"])
                        }
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm mb-2"
                      >
                        <option value="issue">Issue Photo</option>
                        <option value="before">Before Work</option>
                        <option value="during">During Work</option>
                        <option value="after">After Work</option>
                      </select>
                      <input
                        type="text"
                        value={photo.description}
                        onChange={(e) => updatePhotoDescription(index, e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting || uploadingPhotos}
                className="flex-1 px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                {isSubmitting
                  ? uploadingPhotos
                    ? "Uploading Photos..."
                    : "Creating Request..."
                  : "Create Maintenance Request"}
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

export default function NewMaintenanceRequestPage() {
  return (
    <RequireAuth>
    <Suspense fallback={<LoadingScreen />}>
      <NewMaintenanceRequestContent />
    </Suspense>
    </RequireAuth>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
