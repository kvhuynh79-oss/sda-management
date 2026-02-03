"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [additionalComments, setAdditionalComments] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadingGeneral, setUploadingGeneral] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalPhotoRef = useRef<HTMLInputElement>(null);

  const inspectionId = params.id as Id<"inspections">;
  const inspection = useQuery(api.inspections.getInspectionById, { inspectionId });
  const items = useQuery(api.inspections.getItemsByInspection, { inspectionId });
  const generalPhotos = useQuery(api.inspections.getGeneralPhotos, { inspectionId });

  const updateItemStatus = useMutation(api.inspections.updateItemStatus);
  const startInspection = useMutation(api.inspections.startInspection);
  const completeInspection = useMutation(api.inspections.completeInspection);
  const generateUploadUrl = useMutation(api.inspections.generateUploadUrl);
  const savePhoto = useMutation(api.inspections.saveInspectionPhoto);
  const deletePhoto = useMutation(api.inspections.deleteInspectionPhoto);
  const saveGeneralPhoto = useMutation(api.inspections.saveGeneralPhoto);
  const addCustomItem = useMutation(api.inspections.addCustomItem);
  const deleteCustomItem = useMutation(api.inspections.deleteCustomItem);

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

  const handleCompleteInspection = async () => {
    if (!user) return;
    await completeInspection({
      userId: user.id as Id<"users">,
      inspectionId,
      additionalComments: additionalComments || undefined,
    });
    setShowCompleteModal(false);
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
      console.error("Error uploading photo:", error);
      alert("Error uploading photo. Please try again.");
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: Id<"inspectionPhotos">) => {
    if (!user) return;
    if (confirm("Delete this photo?")) {
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
      console.error("Error uploading general photo:", error);
      alert("Error uploading photo. Please try again.");
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
      alert("Please select or enter a category");
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
      console.error("Error adding custom item:", error);
      alert("Error adding item. Please try again.");
    }
  };

  const handleDeleteItem = async (itemId: Id<"inspectionItems">) => {
    if (!user) return;
    if (confirm("Delete this inspection item?")) {
      await deleteCustomItem({ userId: user.id as Id<"users">, itemId });
    }
  };

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
      case "scheduled": return "bg-blue-600";
      case "in_progress": return "bg-yellow-600";
      case "completed": return "bg-green-600";
      case "cancelled": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  const allItemsCompleted = items.every((item) => item.status !== "pending");
  const canComplete = inspection.status !== "completed" && allItemsCompleted;

  return (
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
            <li className="text-gray-600">/</li>
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
                <p className="text-gray-500 text-sm">
                  Dwelling: {inspection.dwelling.dwellingName}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Template: {inspection.template?.name}
              </p>
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
              {inspection.status === "scheduled" && (
                <button
                  onClick={handleStartInspection}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Start Inspection
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Complete
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
                className="h-full bg-blue-600 transition-all duration-300"
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
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <div>
                      <h3 className="text-white font-medium">{category}</h3>
                      <p className="text-gray-500 text-sm">
                        {stats.completed}/{stats.total} completed
                        {stats.failed > 0 && (
                          <span className="text-red-400 ml-1">
                            • {stats.failed} issues
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Mini Progress */}
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stats.failed > 0 ? "bg-yellow-600" : "bg-green-600"}`}
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    />
                  </div>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-gray-700 divide-y divide-gray-700">
                    {categoryItems.map((item) => (
                      <div key={item._id} className="p-4">
                        <div className="flex flex-col gap-3">
                          {/* Item Name */}
                          <p className="text-white">{item.itemName}</p>

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
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleRemarksUpdate(
                                    item._id,
                                    itemRemarks[item._id] || item.remarks || ""
                                  )
                                }
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
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
                                  <span className="text-gray-500">Remarks:</span> {item.remarks}
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
                                  className="text-blue-400 hover:text-blue-300 text-sm"
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
                                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
            <p className="text-gray-500 text-sm">
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
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
              <p className="text-gray-500 text-sm">No general photos</p>
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

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                Complete Inspection
              </h2>
              <p className="text-gray-400 mb-4">
                Are you sure you want to complete this inspection? This action
                cannot be undone.
              </p>

              {inspection.failedItems > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ This inspection has {inspection.failedItems} failed
                    item(s) that may require follow-up.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Additional Comments (Optional)
                </label>
                <textarea
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="Any final observations or recommendations..."
                  rows={3}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteInspection}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                Add Inspection Item
              </h2>
              <p className="text-gray-400 mb-4 text-sm">
                Add a custom item for something that came up during the inspection.
              </p>

              <div className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category...</option>
                    {sortedCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ New Category</option>
                  </select>
                </div>

                {/* Custom Category Input */}
                {newItemCategory === "__custom__" && (
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      New Category Name
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g., Pool Area, Outdoor Furniture..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Item Name */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Item to Inspect
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Check pool pump working..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
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
