"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Id } from "../../../../convex/_generated/dataModel";

type ItemStatus = "pending" | "pass" | "fail" | "na";

interface InspectionItem {
  _id: Id<"inspectionItems">;
  inspectionId: Id<"inspections">;
  category: string;
  itemName: string;
  itemOrder: number;
  status: ItemStatus;
  condition?: string;
  remarks?: string;
  hasIssue: boolean;
  photos?: Array<{
    _id: Id<"inspectionPhotos">;
    url: string | null;
    fileName: string;
    description?: string;
  }>;
}

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionResult, setCompletionResult] = useState<{
    maintenanceRequestsCreated: number;
    failedItems: number;
    skippedNoDwelling: boolean;
    nextInspectionId: string | null;
    nextInspectionDate: string | null;
    alreadyScheduled: boolean;
  } | null>(null);
  const [createMRs, setCreateMRs] = useState(true);
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDate, setNextDate] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [additionalComments, setAdditionalComments] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadingGeneral, setUploadingGeneral] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalPhotoRef = useRef<HTMLInputElement>(null);

  const inspectionId = params.id as Id<"inspections">;
  const inspection = useQuery(api.inspections.getInspectionById, user ? { userId: user.id as Id<"users">, inspectionId } : "skip");
  const items = useQuery(api.inspections.getItemsByInspection, user ? { userId: user.id as Id<"users">, inspectionId } : "skip");
  const generalPhotos = useQuery(api.inspections.getGeneralPhotos, { inspectionId });
  const commonItems = useQuery(api.inspections.getCommonItems, user ? { userId: user.id as Id<"users"> } : "skip");
  const dwellingDiff = useQuery(
    api.inspections.getDwellingTemplateDiff,
    inspection?.dwellingId && inspection?.templateId && user
      ? { dwellingId: inspection.dwellingId, baseTemplateId: inspection.templateId, userId: user.id as Id<"users"> }
      : "skip"
  );

  // Pre-fetch completion summary when modal opens
  const completionSummary = useQuery(
    api.inspections.getCompletionSummary,
    showCompletionModal && user ? { inspectionId, userId: user.id as Id<"users"> } : "skip"
  );

  // Default next inspection date: today + 3 months
  const defaultNextDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  }, []);

  const updateItemStatus = useMutation(api.inspections.updateItemStatus);
  const startInspection = useMutation(api.inspections.startInspection);
  const completeInspection = useMutation(api.inspections.completeInspection);
  const generateUploadUrl = useMutation(api.inspections.generateUploadUrl);
  const savePhoto = useMutation(api.inspections.saveInspectionPhoto);
  const deletePhoto = useMutation(api.inspections.deleteInspectionPhoto);
  const saveGeneralPhoto = useMutation(api.inspections.saveGeneralPhoto);
  const addCustomItem = useMutation(api.inspections.addCustomItem);
  const deleteCustomItem = useMutation(api.inspections.deleteCustomItem);
  const deleteCategoryItems = useMutation(api.inspections.deleteCategoryItems);
  const saveAsTemplateMutation = useMutation(api.inspections.saveAsTemplate);
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();

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
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    });
  }, [router]);

  // Group items by category
  const itemsByCategory: Record<string, InspectionItem[]> = {};
  items?.forEach((item) => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item as InspectionItem);
  });

  // Get category order from template
  const categoryOrder = inspection?.template?.categories?.map((c) => c.name) || [];
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return indexA - indexB;
  });

  const handleStatusChange = async (itemId: Id<"inspectionItems">, status: ItemStatus) => {
    if (!user) return;

    // If inspection is scheduled, start it
    if (inspection?.status === "scheduled") {
      await startInspection({ userId: user.id as Id<"users">, inspectionId });
    }

    await updateItemStatus({
      itemId,
      status,
      remarks: itemRemarks[itemId] || undefined,
      updatedBy: user.id as Id<"users">,
    });
  };

  const handleRemarksUpdate = async (itemId: Id<"inspectionItems">, remarks: string) => {
    if (!user) return;
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    await updateItemStatus({
      itemId,
      status: item.status,
      remarks,
      updatedBy: user.id as Id<"users">,
    });
    setEditingItem(null);
  };

  const handleStartInspection = async () => {
    if (!user) return;
    await startInspection({ userId: user.id as Id<"users">, inspectionId });
  };

  const handleOpenCompletionModal = () => {
    setNextDate(defaultNextDate);
    setCreateMRs(true);
    setScheduleNext(true);
    setCompletionResult(null);
    setIsCompleting(false);
    setShowCompletionModal(true);
  };

  const handleCompleteWithActions = async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
      // Auto-mark remaining pending items as N/A
      const pendingItems = (items ?? []).filter(i => i.status === "pending");
      for (const item of pendingItems) {
        await updateItemStatus({ itemId: item._id, status: "na" as const, updatedBy: user.id as Id<"users"> });
      }
      const result = await completeInspection({
        userId: user.id as Id<"users">,
        inspectionId,
        additionalComments: additionalComments || undefined,
        createMaintenanceRequests: createMRs,
        scheduleNext,
        nextScheduledDate: scheduleNext ? nextDate : undefined,
      });
      setCompletionResult(result);
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to complete inspection. Please try again." });
      setIsCompleting(false);
    }
  };

  const handleCompleteOnly = async () => {
    if (!user) return;
    setIsCompleting(true);
    try {
      // Auto-mark remaining pending items as N/A
      const pendingItems = (items ?? []).filter(i => i.status === "pending");
      for (const item of pendingItems) {
        await updateItemStatus({ itemId: item._id, status: "na" as const, updatedBy: user.id as Id<"users"> });
      }
      const result = await completeInspection({
        userId: user.id as Id<"users">,
        inspectionId,
        additionalComments: additionalComments || undefined,
        createMaintenanceRequests: false,
        scheduleNext: false,
      });
      setCompletionResult(result);
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to complete inspection. Please try again." });
      setIsCompleting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    setUploadingFor(itemId);

    try {
      const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await savePhoto({
        inspectionId,
        inspectionItemId: itemId as Id<"inspectionItems">,
        storageId: storageId as Id<"_storage">,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: user.id as Id<"users">,
      });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Error uploading photo. Please try again." });
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: Id<"inspectionPhotos">) => {
    if (!user) return;
    const confirmed = await confirmDialog({
      title: "Delete Photo",
      message: "Delete this photo?",
      variant: "danger",
      confirmLabel: "Yes",
    });
    if (confirmed) {
      await deletePhoto({ userId: user.id as Id<"users">, photoId });
    }
  };

  const handleGeneralPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    setUploadingGeneral(true);

    try {
      const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await saveGeneralPhoto({
        inspectionId,
        storageId: storageId as Id<"_storage">,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: user.id as Id<"users">,
      });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Error uploading photo. Please try again." });
    } finally {
      setUploadingGeneral(false);
      if (generalPhotoRef.current) {
        generalPhotoRef.current.value = "";
      }
    }
  };

  const handleAddCustomItem = async () => {
    if (!user || !newItemName.trim()) return;

    const category = newItemCategory === "__custom__" ? customCategory.trim() : newItemCategory;
    if (!category) {
      await alertDialog({ title: "Notice", message: "Please select or enter a category" });
      return;
    }

    try {
      await addCustomItem({
        inspectionId,
        category,
        itemName: newItemName.trim(),
        createdBy: user.id as Id<"users">,
      });

      // Reset form
      setNewItemName("");
      setNewItemCategory("");
      setCustomCategory("");
      setShowAddItemModal(false);

      // Expand the category to show the new item
      setExpandedCategory(category);
    } catch (error) {
      await alertDialog({ title: "Error", message: "Error adding item. Please try again." });
    }
  };

  const handleDeleteItem = async (itemId: Id<"inspectionItems">) => {
    if (!user) return;
    const itemToDelete = items?.find((i) => i._id === itemId);
    const confirmed = await confirmDialog({
      title: "Remove Item",
      message: `Remove "${itemToDelete?.itemName || "this item"}" from this inspection? This will also update the dwelling template.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (confirmed) {
      await deleteCustomItem({ userId: user.id as Id<"users">, itemId });
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!user || !inspection) return;
    const catItems = itemsByCategory[category];
    const confirmed = await confirmDialog({
      title: "Remove Category",
      message: `Remove all ${catItems?.length || 0} items in "${category}"? This will also update the dwelling template.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (confirmed) {
      await deleteCategoryItems({
        userId: user.id as Id<"users">,
        inspectionId,
        category,
      });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!user || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await saveAsTemplateMutation({
        userId: user.id as Id<"users">,
        inspectionId,
        templateName: templateName.trim(),
      });
      setShowSaveTemplateModal(false);
      setTemplateName("");
      const itemCount = items?.length || 0;
      const categoryCount = new Set(items?.map((i) => i.category) || []).size;
      await alertDialog({
        title: "Template Saved",
        message: `Template "${templateName.trim()}" created with ${itemCount} items across ${categoryCount} categories.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error saving template. Please try again.";
      await alertDialog({ title: "Error", message: errorMessage });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Build a set of existing item names (category + itemName) for duplicate detection in the add modal
  const existingItemKeys = useMemo(() => {
    const keys = new Set<string>();
    items?.forEach((item) => {
      keys.add(`${item.category}::${item.itemName}`);
    });
    return keys;
  }, [items]);

  if (!user) {
    return <LoadingScreen />;
  }

  if (inspection === undefined || items === undefined) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="inspections" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-gray-400 text-center py-12">Loading inspection...</div>
        </main>
      </div>
    );
  }

  if (inspection === null) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="inspections" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-red-400 text-center py-12">Inspection not found</div>
        </main>
      </div>
    );
  }

  const getCategoryStats = (categoryItems: InspectionItem[]) => {
    const total = categoryItems.length;
    const completed = categoryItems.filter((i) => i.status !== "pending").length;
    const passed = categoryItems.filter((i) => i.status === "pass").length;
    const failed = categoryItems.filter((i) => i.status === "fail").length;
    return { total, completed, passed, failed };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-teal-700";
      case "in_progress": return "bg-yellow-600";
      case "completed": return "bg-green-600";
      case "cancelled": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const allItemsCompleted = pendingCount === 0;
  const canComplete = inspection.status !== "completed" && inspection.status !== "scheduled";

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="inspections" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Breadcrumb - hidden on mobile for space */}
        <nav className="mb-4 hidden sm:block">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/inspections" className="text-gray-400 hover:text-white">
                Inspections
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-white truncate max-w-[200px]">
              {inspection.property?.propertyName || inspection.property?.addressLine1}
            </li>
          </ol>
        </nav>

        {/* Header Card */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {inspection.property?.propertyName || inspection.property?.addressLine1}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-xs text-white ${getStatusColor(inspection.status)}`}>
                  {inspection.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {inspection.property?.addressLine1}, {inspection.property?.suburb}
              </p>
              {inspection.dwelling && (
                <p className="text-gray-400 text-sm">
                  Dwelling: {inspection.dwelling.dwellingName}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 text-sm">
                  Template: {inspection.template?.name}
                </p>
                {dwellingDiff && (dwellingDiff.addedItems.length > 0 || dwellingDiff.removedItems.length > 0) && (
                  <span className="text-xs bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded-full" title={`${dwellingDiff.addedItems.length} added, ${dwellingDiff.removedItems.length} removed`}>
                    Customized for {inspection.dwelling?.dwellingName || "this dwelling"}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {inspection.status !== "completed" && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  + Add Item
                </button>
              )}
              <button
                onClick={() => {
                  setTemplateName("");
                  setShowSaveTemplateModal(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Save as Template
              </button>
              {inspection.status === "scheduled" && (
                <button
                  onClick={handleStartInspection}
                  className="flex-1 sm:flex-none px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Start Inspection
                </button>
              )}
              {canComplete && (
                <button
                  onClick={handleOpenCompletionModal}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {allItemsCompleted ? "Complete" : `Complete (${pendingCount} remaining)`}
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Progress</span>
              <span>
                {inspection.completedItems}/{inspection.totalItems} items
                {inspection.failedItems > 0 && (
                  <span className="text-red-400 ml-2">
                    ({inspection.failedItems} issues)
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all duration-300"
                style={{
                  width: `${inspection.totalItems > 0
                    ? (inspection.completedItems / inspection.totalItems) * 100
                    : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Categories Accordion */}
        <div className="space-y-2">
          {sortedCategories.map((category) => {
            const categoryItems = itemsByCategory[category];
            const stats = getCategoryStats(categoryItems);
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <div>
                      <h3 className="text-white font-medium">{category}</h3>
                      <p className="text-gray-400 text-sm">
                        {stats.completed}/{stats.total} completed
                        {stats.failed > 0 && (
                          <span className="text-red-400 ml-1">
                            • {stats.failed} issues
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inspection.status !== "completed" && stats.completed === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"
                        aria-label={`Remove ${category} category`}
                      >
                        Remove
                      </button>
                    )}
                    {/* Mini Progress */}
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stats.failed > 0 ? "bg-yellow-600" : "bg-green-600"}`}
                        style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-gray-700 divide-y divide-gray-700">
                    {categoryItems.map((item) => (
                      <div key={item._id} className="p-4">
                        <div className="flex flex-col gap-3">
                          {/* Item Name + Delete */}
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-white flex-1">{item.itemName}</p>
                            {inspection.status !== "completed" && item.status === "pending" && (
                              <button
                                onClick={() => handleDeleteItem(item._id)}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors flex-shrink-0"
                                title="Remove item"
                                aria-label={`Remove ${item.itemName}`}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Status Buttons - Large for mobile */}
                          <div className="flex gap-2">
                            <StatusButton
                              label="Pass"
                              status="pass"
                              currentStatus={item.status}
                              onClick={() => handleStatusChange(item._id, "pass")}
                              disabled={inspection.status === "completed"}
                            />
                            <StatusButton
                              label="Fail"
                              status="fail"
                              currentStatus={item.status}
                              onClick={() => handleStatusChange(item._id, "fail")}
                              disabled={inspection.status === "completed"}
                            />
                            <StatusButton
                              label="N/A"
                              status="na"
                              currentStatus={item.status}
                              onClick={() => handleStatusChange(item._id, "na")}
                              disabled={inspection.status === "completed"}
                            />
                          </div>

                          {/* Remarks Section */}
                          {editingItem === item._id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={itemRemarks[item._id] || item.remarks || ""}
                                onChange={(e) =>
                                  setItemRemarks({
                                    ...itemRemarks,
                                    [item._id]: e.target.value,
                                  })
                                }
                                placeholder="Add remarks..."
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleRemarksUpdate(
                                    item._id,
                                    itemRemarks[item._id] || item.remarks || ""
                                  )
                                }
                                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {item.remarks ? (
                                <p className="text-gray-400 text-sm flex-1">
                                  <span className="text-gray-400">Remarks:</span> {item.remarks}
                                </p>
                              ) : null}
                              {inspection.status !== "completed" && (
                                <button
                                  onClick={() => {
                                    setItemRemarks({
                                      ...itemRemarks,
                                      [item._id]: item.remarks || "",
                                    });
                                    setEditingItem(item._id);
                                  }}
                                  className="text-teal-500 hover:text-teal-400 text-sm"
                                >
                                  {item.remarks ? "Edit" : "+ Add Remarks"}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Photo Section - Always available for all items */}
                          <div className="mt-2">
                            {/* Existing Photos */}
                            {item.photos && item.photos.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {item.photos.map((photo) => (
                                  <div key={photo._id} className="relative group">
                                    {photo.url && (
                                      <img
                                        src={photo.url}
                                        alt={photo.fileName}
                                        className="w-20 h-20 object-cover rounded-lg"
                                      />
                                    )}
                                    {inspection.status !== "completed" && (
                                      <button
                                        onClick={() => handleDeletePhoto(photo._id)}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Upload Button */}
                            {inspection.status !== "completed" && (
                              <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg cursor-pointer text-sm transition-colors">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handlePhotoUpload(e, item._id)}
                                  className="hidden"
                                />
                                {uploadingFor === item._id ? (
                                  "Uploading..."
                                ) : (
                                  <>
                                    📷 {item.photos?.length ? "Add Photo" : "Take Photo"}
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* General Photos Section - For photos not tied to specific items */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-gray-700">
            <h3 className="text-white font-medium">General Photos</h3>
            <p className="text-gray-400 text-sm">
              Photos for items not on the checklist
            </p>
          </div>
          <div className="p-4">
            {/* Existing General Photos */}
            {generalPhotos && generalPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {generalPhotos.map((photo) => (
                  <div key={photo._id} className="relative group">
                    {photo.url && (
                      <img
                        src={photo.url}
                        alt={photo.fileName}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    {photo.description && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[96px] truncate">
                        {photo.description}
                      </p>
                    )}
                    {inspection.status !== "completed" && (
                      <button
                        onClick={() => handleDeletePhoto(photo._id)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button for General Photos */}
            {inspection.status !== "completed" && (
              <label className="inline-flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg cursor-pointer transition-colors">
                <input
                  ref={generalPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleGeneralPhotoUpload}
                  className="hidden"
                />
                {uploadingGeneral ? (
                  "Uploading..."
                ) : (
                  <>
                    📷 Add General Photo
                  </>
                )}
              </label>
            )}

            {!generalPhotos?.length && inspection.status === "completed" && (
              <p className="text-gray-400 text-sm">No general photos</p>
            )}
          </div>
        </div>

        {/* Additional Comments (for completed inspections) */}
        {inspection.status === "completed" && inspection.additionalComments && (
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <h3 className="text-white font-medium mb-2">Additional Comments</h3>
            <p className="text-gray-400">{inspection.additionalComments}</p>
          </div>
        )}

        {/* Enhanced Completion Modal */}
        {showCompletionModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Complete inspection"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isCompleting && !completionResult) {
                setShowCompletionModal(false);
              }
            }}
          >
            <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-700">

              {/* POST-COMPLETION RESULTS VIEW */}
              {completionResult ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Inspection Completed</h2>
                      <p className="text-gray-400 text-sm">All actions have been processed successfully.</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {completionResult.maintenanceRequestsCreated > 0 && (
                      <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                        <svg className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.3-5.3m0 0l-1.12 1.12m1.12-1.12l5.3 5.3m0 0l1.12-1.12M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-300 text-sm">
                          <span className="font-medium text-white">{completionResult.maintenanceRequestsCreated}</span> maintenance request{completionResult.maintenanceRequestsCreated !== 1 ? "s" : ""} created for failed items
                        </p>
                      </div>
                    )}

                    {completionResult.skippedNoDwelling && completionResult.failedItems > 0 && (
                      <div className="flex items-start gap-3 bg-yellow-900/20 rounded-lg p-3">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <p className="text-yellow-400 text-sm">
                          Maintenance requests were skipped because no dwelling is assigned to this inspection.
                        </p>
                      </div>
                    )}

                    {completionResult.nextInspectionDate && (
                      <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                        <svg className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <p className="text-gray-300 text-sm">
                          Next inspection {completionResult.alreadyScheduled ? "already " : ""}scheduled for{" "}
                          <span className="font-medium text-white">
                            {new Date(completionResult.nextInspectionDate + "T00:00:00").toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                      </div>
                    )}

                    {!completionResult.nextInspectionDate && !completionResult.alreadyScheduled && (
                      <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-3">
                        <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <p className="text-gray-400 text-sm">No follow-up inspection was scheduled.</p>
                      </div>
                    )}
                  </div>

                  {/* Action Links */}
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-xs mb-3 uppercase tracking-wide font-medium">Quick Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {completionResult.maintenanceRequestsCreated > 0 && (
                        <Link
                          href="/maintenance"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.3-5.3m0 0l-1.12 1.12m1.12-1.12l5.3 5.3m0 0l1.12-1.12M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          View Maintenance Requests
                        </Link>
                      )}
                      {completionResult.nextInspectionId && (
                        <Link
                          href={`/inspections/${completionResult.nextInspectionId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          View Next Inspection
                        </Link>
                      )}
                      {inspection.propertyId && (
                        <Link
                          href={`/properties/${inspection.propertyId}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                          </svg>
                          View Property
                        </Link>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCompletionModal(false)}
                    className="w-full mt-4 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* PRE-COMPLETION SUMMARY VIEW */
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Complete Inspection</h2>
                  <p className="text-gray-400 text-sm mb-5">
                    Review the summary below and choose how to finalize this inspection.
                  </p>

                  {/* Loading state while summary loads */}
                  {!completionSummary ? (
                    <div className="text-gray-400 text-center py-8">Loading summary...</div>
                  ) : (
                    <>
                      {/* Section 1: Inspection Summary */}
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">Summary</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-400">{completionSummary.summary.passedItems}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              Passed of {completionSummary.summary.totalItems}
                            </div>
                          </div>
                          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-red-400">{completionSummary.summary.failedItems}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              Failed item{completionSummary.summary.failedItems !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        {completionSummary.summary.naItems > 0 && (
                          <p className="text-gray-400 text-xs mt-2 text-center">
                            {completionSummary.summary.naItems} item{completionSummary.summary.naItems !== 1 ? "s" : ""} marked N/A
                          </p>
                        )}
                      </div>

                      {/* Section 2: Failed Items List */}
                      {completionSummary.failedItemDetails.length > 0 && (
                        <div className="border-t border-gray-700 mt-4 pt-4 mb-4">
                          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                            Failed Items ({completionSummary.failedItemDetails.length})
                          </h3>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                            {completionSummary.failedItemDetails.map((item) => (
                              <div key={item._id} className="bg-gray-700/50 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
                                        {item.category}
                                      </span>
                                      <span className="text-white text-sm font-medium truncate">
                                        {item.itemName}
                                      </span>
                                    </div>
                                    {item.condition && (
                                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                                        item.condition === "Poor"
                                          ? "bg-red-900/30 text-red-400"
                                          : item.condition === "Fair"
                                            ? "bg-yellow-900/30 text-yellow-400"
                                            : "bg-gray-600 text-gray-300"
                                      }`}>
                                        Condition: {item.condition}
                                      </span>
                                    )}
                                    {item.remarks && (
                                      <p className="text-gray-400 text-xs mt-1 italic">
                                        &ldquo;{item.remarks}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pending Items Warning */}
                      {pendingCount > 0 && (
                        <div className="border-t border-gray-700 mt-4 pt-4 mb-4">
                          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                              <div>
                                <p className="text-yellow-400 text-sm font-medium">
                                  {pendingCount} item{pendingCount !== 1 ? "s" : ""} still pending
                                </p>
                                <p className="text-yellow-400/70 text-xs mt-0.5">
                                  Remaining items will be automatically marked as N/A when you complete.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 3: Maintenance Requests */}
                      <div className="border-t border-gray-700 mt-4 pt-4 mb-4">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                          Maintenance Requests
                        </h3>
                        {completionSummary.hasDwelling ? (
                          completionSummary.summary.failedItems > 0 ? (
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={createMRs}
                                onChange={(e) => setCreateMRs(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded bg-gray-700 border-gray-600 text-teal-600 focus:ring-teal-600 focus:ring-offset-gray-800 cursor-pointer"
                              />
                              <div>
                                <p className="text-gray-300 text-sm group-hover:text-white transition-colors">
                                  Create maintenance requests for {completionSummary.summary.failedItems} failed item{completionSummary.summary.failedItems !== 1 ? "s" : ""}
                                </p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  Each failed item will generate a maintenance request for follow-up.
                                </p>
                              </div>
                            </label>
                          ) : (
                            <p className="text-gray-400 text-sm">
                              No failed items found. No maintenance requests needed.
                            </p>
                          )
                        ) : (
                          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                              <div>
                                <p className="text-yellow-400 text-sm font-medium">
                                  No dwelling assigned
                                </p>
                                <p className="text-yellow-400/70 text-xs mt-0.5">
                                  Maintenance requests cannot be created automatically. Assign a dwelling to enable this feature.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 4: Next Inspection */}
                      <div className="border-t border-gray-700 mt-4 pt-4 mb-4">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                          Next Inspection
                        </h3>
                        {completionSummary.existingNextInspection ? (
                          <div className="flex items-start gap-2 bg-teal-900/20 border border-teal-800 rounded-lg p-3">
                            <svg className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            <p className="text-teal-400 text-sm">
                              Next inspection already scheduled for{" "}
                              <span className="font-medium text-white">
                                {new Date(completionSummary.existingNextInspection.scheduledDate + "T00:00:00").toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={scheduleNext}
                                onChange={(e) => setScheduleNext(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded bg-gray-700 border-gray-600 text-teal-600 focus:ring-teal-600 focus:ring-offset-gray-800 cursor-pointer"
                              />
                              <div>
                                <p className="text-gray-300 text-sm group-hover:text-white transition-colors">
                                  Schedule next inspection
                                </p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  Automatically create a follow-up inspection using the same template.
                                </p>
                              </div>
                            </label>
                            {scheduleNext && (
                              <div className="mt-3 ml-7">
                                <label htmlFor="next-inspection-date" className="block text-gray-400 text-xs mb-1">Scheduled Date</label>
                                <input
                                  id="next-inspection-date"
                                  type="date"
                                  value={nextDate}
                                  onChange={(e) => setNextDate(e.target.value)}
                                  autoComplete="off"
                                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section: Additional Comments */}
                      <div className="border-t border-gray-700 mt-4 pt-4 mb-5">
                        <label htmlFor="completion-comments" className="block text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                          Additional Comments
                        </label>
                        <textarea
                          id="completion-comments"
                          value={additionalComments}
                          onChange={(e) => setAdditionalComments(e.target.value)}
                          placeholder="Any final observations or recommendations..."
                          rows={2}
                          autoComplete="off"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        />
                      </div>

                      {/* Section 5: Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleCompleteWithActions}
                          disabled={isCompleting}
                          className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
                        >
                          {isCompleting ? "Completing..." : "Complete & Action"}
                        </button>
                        <button
                          onClick={handleCompleteOnly}
                          disabled={isCompleting}
                          className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                        >
                          {isCompleting ? "Completing..." : "Complete Only"}
                        </button>
                        <button
                          onClick={() => setShowCompletionModal(false)}
                          disabled={isCompleting}
                          className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Custom Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 id="add-item-title" className="text-xl font-bold text-white mb-4">
                Add Inspection Item
              </h2>
              <p className="text-gray-400 mb-4 text-sm">
                Select a common item from other templates, or enter a custom item.
              </p>

              <div className="space-y-4">
                {/* Common Items Dropdown */}
                {commonItems && commonItems.length > 0 && (
                  <div>
                    <label htmlFor="common-items-select" className="block text-gray-300 text-sm font-medium mb-1">
                      Select from common items
                    </label>
                    <select
                      id="common-items-select"
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [selectedCategory, ...nameParts] = e.target.value.split("::");
                        const selectedName = nameParts.join("::");
                        setNewItemCategory(selectedCategory);
                        setNewItemName(selectedName);
                        setCustomCategory("");
                      }}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="">Select from common items...</option>
                      {commonItems.map((group) => (
                        <optgroup key={group.category} label={group.category}>
                          {group.items.map((itemName) => {
                            const isAlreadyAdded = existingItemKeys.has(`${group.category}::${itemName}`);
                            return (
                              <option
                                key={`${group.category}::${itemName}`}
                                value={`${group.category}::${itemName}`}
                                disabled={isAlreadyAdded}
                              >
                                {itemName}{isAlreadyAdded ? " (already added)" : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}

                {/* Divider */}
                {commonItems && commonItems.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-700" />
                    <span className="text-gray-400 text-xs uppercase tracking-wider">or enter custom</span>
                    <div className="flex-1 border-t border-gray-700" />
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label htmlFor="item-category-select" className="block text-gray-300 text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    id="item-category-select"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="">Select a category...</option>
                    {sortedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {/* Include categories from common items not already in this inspection */}
                    {commonItems?.filter((g) => !sortedCategories.includes(g.category)).map((g) => (
                      <option key={`common-${g.category}`} value={g.category}>
                        {g.category}
                      </option>
                    ))}
                    <option value="__custom__">+ New Category</option>
                  </select>
                </div>

                {/* Custom Category Input */}
                {newItemCategory === "__custom__" && (
                  <div>
                    <label htmlFor="custom-category-input" className="block text-gray-300 text-sm font-medium mb-1">
                      New Category Name
                    </label>
                    <input
                      id="custom-category-input"
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g., Pool Area, Outdoor Furniture..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Item Name */}
                <div>
                  <label htmlFor="item-name-input" className="block text-gray-300 text-sm font-medium mb-1">
                    Item to Inspect
                  </label>
                  <input
                    id="item-name-input"
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Check pool pump working..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    autoComplete="off"
                  />
                  {newItemName.trim() && newItemCategory && newItemCategory !== "__custom__" && existingItemKeys.has(`${newItemCategory}::${newItemName.trim()}`) && (
                    <p className="text-yellow-400 text-xs mt-1">This item already exists in this inspection.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddItemModal(false);
                    setNewItemName("");
                    setNewItemCategory("");
                    setCustomCategory("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomItem}
                  disabled={!newItemName.trim() || (!newItemCategory || (newItemCategory === "__custom__" && !customCategory.trim()))}
                  className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save as Template Modal */}
        {showSaveTemplateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="save-template-title">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 id="save-template-title" className="text-xl font-bold text-white mb-4">
                Save as Template
              </h2>
              <p className="text-gray-400 mb-4 text-sm">
                Save the current inspection checklist (with all customizations) as a reusable template.
              </p>

              <div className="mb-4">
                <label htmlFor="template-name-input" className="block text-gray-300 text-sm font-medium mb-1">
                  Template Name
                </label>
                <input
                  id="template-name-input"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., 3-Bedroom HPS Inspection..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <p className="text-gray-400 text-sm">
                  This will create a new template with{" "}
                  <span className="text-white font-medium">{items?.length || 0} items</span>{" "}
                  across{" "}
                  <span className="text-white font-medium">{new Set(items?.map((i) => i.category) || []).size} categories</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  disabled={savingTemplate}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || savingTemplate}
                  className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {savingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </RequireAuth>
  );
}

function StatusButton({
  label,
  status,
  currentStatus,
  onClick,
  disabled,
}: {
  label: string;
  status: ItemStatus;
  currentStatus: ItemStatus;
  onClick: () => void;
  disabled: boolean;
}) {
  const isSelected = currentStatus === status;
  const baseClasses = "flex-1 py-3 rounded-lg font-medium text-sm transition-colors";

  let colorClasses = "";
  if (isSelected) {
    switch (status) {
      case "pass":
        colorClasses = "bg-green-600 text-white";
        break;
      case "fail":
        colorClasses = "bg-red-600 text-white";
        break;
      case "na":
        colorClasses = "bg-gray-600 text-white";
        break;
      default:
        colorClasses = "bg-gray-600 text-white";
    }
  } else {
    colorClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${colorClasses} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {label}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  );
}
