"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  DEFAULT_EASY_READ_FIELD_MAP,
  type FieldMapping,
  type FieldPosition,
} from "@/utils/templatePdfOverlay";

export default function TemplateSettingsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]} loadingMessage="Loading template settings...">
      <TemplateSettingsContent />
    </RequireAuth>
  );
}

function TemplateSettingsContent() {
  const { alert: alertDialog, confirm: confirmDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Queries
  const templateInfo = useQuery(
    api.providerSettings.getEasyReadTemplateUrl,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.providerSettings.generateTemplateUploadUrl);
  const saveTemplate = useMutation(api.providerSettings.saveEasyReadTemplate);
  const removeTemplate = useMutation(api.providerSettings.removeEasyReadTemplate);
  const saveFieldMap = useMutation(api.providerSettings.saveEasyReadFieldMap);

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSavingFieldMap, setIsSavingFieldMap] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field map editor state
  const [fieldMap, setFieldMap] = useState<FieldMapping[]>(DEFAULT_EASY_READ_FIELD_MAP);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [fieldMapDirty, setFieldMapDirty] = useState(false);

  // New field form state
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldPage, setNewFieldPage] = useState(0);
  const [newFieldX, setNewFieldX] = useState(230);
  const [newFieldY, setNewFieldY] = useState(400);
  const [newFieldFontSize, setNewFieldFontSize] = useState(12);
  const [newFieldMaxWidth, setNewFieldMaxWidth] = useState(330);
  const [newFieldAlignment, setNewFieldAlignment] = useState<"left" | "center" | "right">("left");
  const [newFieldBold, setNewFieldBold] = useState(false);

  // Load saved field map from backend
  useEffect(() => {
    if (templateInfo?.fieldMap) {
      try {
        const parsed = JSON.parse(templateInfo.fieldMap) as FieldMapping[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFieldMap(parsed);
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, [templateInfo?.fieldMap]);

  // Set preview URL from template
  useEffect(() => {
    if (templateInfo?.url) {
      setPreviewUrl(templateInfo.url);
    }
  }, [templateInfo?.url]);

  const handleTemplateUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      await alertDialog({
        title: "Invalid File Type",
        message: "Please upload a PDF file. Export your Canva design as PDF before uploading.",
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      await alertDialog({
        title: "File Too Large",
        message: "Template PDF must be under 20MB. Try reducing image quality in your Canva export settings.",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl({ userId: user.id as Id<"users"> });

      // Upload the file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Save reference in provider settings
      await saveTemplate({
        userId: user.id as Id<"users">,
        storageId,
        fileName: file.name,
      });

      await alertDialog({
        title: "Template Uploaded",
        message: "Your Easy Read template has been uploaded. You can now configure field positions below.",
      });
    } catch (error) {
      await alertDialog({
        title: "Upload Failed",
        message: "Failed to upload the template PDF. Please try again.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [user, generateUploadUrl, saveTemplate, alertDialog]);

  const handleRemoveTemplate = async () => {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: "Remove Template",
      message: "Are you sure you want to remove the uploaded template? The system will fall back to the built-in Easy Read generator.",
      confirmLabel: "Remove",
      variant: "danger",
    });

    if (!confirmed) return;

    setIsRemoving(true);
    try {
      await removeTemplate({ userId: user.id as Id<"users"> });
      setPreviewUrl(null);
      await alertDialog({
        title: "Template Removed",
        message: "The template has been removed. The system will now use the built-in Easy Read generator.",
      });
    } catch (error) {
      await alertDialog({
        title: "Error",
        message: "Failed to remove the template. Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSaveFieldMap = async () => {
    if (!user) return;

    setIsSavingFieldMap(true);
    try {
      const json = JSON.stringify(fieldMap, null, 2);
      await saveFieldMap({
        userId: user.id as Id<"users">,
        fieldMapJson: json,
      });
      setFieldMapDirty(false);
      await alertDialog({
        title: "Field Map Saved",
        message: "Field positions have been saved. They will be used when generating Easy Read PDFs from the template.",
      });
    } catch (error) {
      await alertDialog({
        title: "Error",
        message: "Failed to save field positions. Please try again.",
      });
    } finally {
      setIsSavingFieldMap(false);
    }
  };

  const handleResetFieldMap = async () => {
    const confirmed = await confirmDialog({
      title: "Reset to Defaults",
      message: "Reset all field positions to the default Easy Read layout? Any custom positions will be lost.",
      confirmLabel: "Reset",
      variant: "danger",
    });

    if (!confirmed) return;
    setFieldMap(DEFAULT_EASY_READ_FIELD_MAP);
    setFieldMapDirty(true);
  };

  const handleUpdateField = (index: number, updates: Partial<FieldMapping>) => {
    setFieldMap((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      if (updates.position) {
        next[index].position = { ...next[index].position, ...updates.position };
      }
      return next;
    });
    setFieldMapDirty(true);
  };

  const handleUpdateFieldPosition = (index: number, posUpdates: Partial<FieldPosition>) => {
    setFieldMap((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        position: { ...next[index].position, ...posUpdates },
      };
      return next;
    });
    setFieldMapDirty(true);
  };

  const handleRemoveField = async (index: number) => {
    const field = fieldMap[index];
    const confirmed = await confirmDialog({
      title: "Remove Field",
      message: `Remove "${field.label}" from the field map?`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    setFieldMap((prev) => prev.filter((_, i) => i !== index));
    setFieldMapDirty(true);
    setEditingFieldIndex(null);
  };

  const handleAddField = () => {
    if (!newFieldName.trim() || !newFieldLabel.trim()) {
      return;
    }

    // Check for duplicate field names
    if (fieldMap.some((f) => f.fieldName === newFieldName.trim())) {
      alertDialog({
        title: "Duplicate Field",
        message: `A field with the name "${newFieldName}" already exists.`,
      });
      return;
    }

    const newField: FieldMapping = {
      fieldName: newFieldName.trim(),
      label: newFieldLabel.trim(),
      position: {
        page: newFieldPage,
        x: newFieldX,
        y: newFieldY,
        fontSize: newFieldFontSize,
        maxWidth: newFieldMaxWidth > 0 ? newFieldMaxWidth : undefined,
        alignment: newFieldAlignment,
        bold: newFieldBold,
      },
    };

    setFieldMap((prev) => [...prev, newField]);
    setFieldMapDirty(true);
    setShowAddField(false);

    // Reset form
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldPage(0);
    setNewFieldX(230);
    setNewFieldY(400);
    setNewFieldFontSize(12);
    setNewFieldMaxWidth(330);
    setNewFieldAlignment("left");
    setNewFieldBold(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-400" aria-label="Breadcrumb">
          <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
          <span className="mx-2">/</span>
          <span className="text-white">PDF Templates</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">PDF Templates</h1>
          <p className="text-gray-400 mt-1">
            Upload a professionally designed PDF template for Easy Read consent forms.
            The system will overlay participant details at the positions you configure below.
          </p>
        </div>

        {/* Template Upload Section */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Easy Read Consent Template
          </h2>

          <p className="text-gray-400 text-sm mb-4">
            Design your template in Canva following the NDIS Commission Easy Read format (12 pages, A4 portrait,
            two-column layout with images). Leave blank spaces where participant details will be overlaid.
            Export as PDF and upload here.
          </p>

          {/* Current template status */}
          {templateInfo?.url ? (
            <div className="bg-gray-900/50 rounded-lg border border-gray-600 p-4 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-900/30 border border-teal-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">{templateInfo.fileName}</p>
                    {templateInfo.uploadedAt && (
                      <p className="text-gray-400 text-sm">
                        Uploaded {formatDate(templateInfo.uploadedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={templateInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    Preview
                  </a>
                  <button
                    onClick={handleRemoveTemplate}
                    disabled={isRemoving}
                    className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    {isRemoving ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/50 rounded-lg border border-dashed border-gray-600 p-6 mb-4 text-center">
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-400 text-sm mb-1">No template uploaded</p>
              <p className="text-gray-500 text-xs">
                The system is currently using the built-in Easy Read generator with illustrations.
              </p>
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleTemplateUpload}
              className="hidden"
              id="template-upload"
              aria-label="Upload Easy Read PDF template"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : templateInfo?.url ? (
                "Replace Template"
              ) : (
                "Upload Template PDF"
              )}
            </button>
          </div>
        </section>

        {/* Template Design Guide */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <details>
            <summary className="text-lg font-semibold text-white cursor-pointer flex items-center gap-2 select-none">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Template Design Guide
            </summary>
            <div className="mt-4 space-y-4 text-sm text-gray-400">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-medium mb-2">Page Structure (12 pages)</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Cover page (org name, title)</li>
                    <li>How to use this document</li>
                    <li>What is this about? (dynamic)</li>
                    <li>What we collect (dynamic)</li>
                    <li>Who we share with</li>
                    <li>Your rights</li>
                    <li>How long we keep info</li>
                    <li>Keeping your info safe</li>
                    <li>Signature page (dynamic)</li>
                    <li>Complaints (dynamic)</li>
                    <li>Word list / glossary</li>
                    <li>Contact us (dynamic)</li>
                  </ol>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-white font-medium mb-2">Design Requirements</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>A4 portrait (595 x 842 pts)</li>
                    <li>Two-column: images ~35% left, text ~60% right</li>
                    <li>16pt+ body text for accessibility</li>
                    <li>Purple accent bars (#6D28D9)</li>
                    <li>Stock photos from Photosymbols or Canva</li>
                    <li>Leave blank text areas for dynamic overlay</li>
                    <li>NDIS Commission Easy Read format</li>
                  </ul>
                </div>
              </div>
              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-3">
                <p className="text-purple-300 font-medium mb-1">Coordinate System</p>
                <p className="text-gray-400">
                  pdf-lib uses bottom-left origin. x increases rightward, y increases upward.
                  A4 page is 595.28 x 841.89 points. Use the field editor below to position each
                  dynamic field. You may need to iterate: upload template, adjust positions, preview,
                  and repeat.
                </p>
              </div>
            </div>
          </details>
        </section>

        {/* Field Mapping Editor */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Field Positions ({fieldMap.length} fields)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFieldMap}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Reset Defaults
              </button>
              <button
                onClick={() => setShowAddField(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                + Add Field
              </button>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Configure where each dynamic field appears on the template. Positions use the pdf-lib coordinate
            system: origin at bottom-left, x increases rightward, y increases upward.
          </p>

          {/* Field list */}
          <div className="space-y-2">
            {fieldMap.map((field, index) => (
              <div
                key={field.fieldName}
                className={`bg-gray-900/50 rounded-lg border transition-colors ${
                  editingFieldIndex === index ? "border-teal-600" : "border-gray-700 hover:border-gray-600"
                }`}
              >
                {/* Field header row */}
                <button
                  onClick={() => setEditingFieldIndex(editingFieldIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg"
                  aria-expanded={editingFieldIndex === index}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-700 text-gray-300 text-xs font-mono">
                      P{field.position.page + 1}
                    </span>
                    <div>
                      <span className="text-white text-sm font-medium">{field.label}</span>
                      <span className="text-gray-500 text-xs ml-2 font-mono">{field.fieldName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400 text-xs font-mono">
                    <span>x:{field.position.x}</span>
                    <span>y:{field.position.y}</span>
                    <span>{field.position.fontSize}pt</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${editingFieldIndex === index ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded editor */}
                {editingFieldIndex === index && (
                  <div className="border-t border-gray-700 p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Page (0-indexed)</label>
                        <input
                          type="number"
                          value={field.position.page}
                          onChange={(e) => handleUpdateFieldPosition(index, { page: parseInt(e.target.value) || 0 })}
                          min={0}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">X (from left)</label>
                        <input
                          type="number"
                          value={field.position.x}
                          onChange={(e) => handleUpdateFieldPosition(index, { x: parseFloat(e.target.value) || 0 })}
                          step={1}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Y (from bottom)</label>
                        <input
                          type="number"
                          value={field.position.y}
                          onChange={(e) => handleUpdateFieldPosition(index, { y: parseFloat(e.target.value) || 0 })}
                          step={1}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Font Size (pt)</label>
                        <input
                          type="number"
                          value={field.position.fontSize}
                          onChange={(e) => handleUpdateFieldPosition(index, { fontSize: parseInt(e.target.value) || 12 })}
                          min={6}
                          max={72}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Max Width (0 = none)</label>
                        <input
                          type="number"
                          value={field.position.maxWidth || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleUpdateFieldPosition(index, { maxWidth: val > 0 ? val : undefined });
                          }}
                          min={0}
                          step={10}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Alignment</label>
                        <select
                          value={field.position.alignment || "left"}
                          onChange={(e) => handleUpdateFieldPosition(index, { alignment: e.target.value as "left" | "center" | "right" })}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.position.bold || false}
                            onChange={(e) => handleUpdateFieldPosition(index, { bold: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-teal-600 focus:ring-teal-500"
                          />
                          Bold
                        </label>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveField(index)}
                          className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg transition-colors text-sm w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Color editor */}
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Text Color (RGB 0-1)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={field.position.color?.r ?? 0.15}
                          onChange={(e) => {
                            const r = parseFloat(e.target.value) || 0;
                            const g = field.position.color?.g ?? 0.15;
                            const b = field.position.color?.b ?? 0.15;
                            handleUpdateFieldPosition(index, { color: { r, g, b } });
                          }}
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                          aria-label="Red"
                        />
                        <input
                          type="number"
                          value={field.position.color?.g ?? 0.15}
                          onChange={(e) => {
                            const r = field.position.color?.r ?? 0.15;
                            const g = parseFloat(e.target.value) || 0;
                            const b = field.position.color?.b ?? 0.15;
                            handleUpdateFieldPosition(index, { color: { r, g, b } });
                          }}
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                          aria-label="Green"
                        />
                        <input
                          type="number"
                          value={field.position.color?.b ?? 0.15}
                          onChange={(e) => {
                            const r = field.position.color?.r ?? 0.15;
                            const g = field.position.color?.g ?? 0.15;
                            const b = parseFloat(e.target.value) || 0;
                            handleUpdateFieldPosition(index, { color: { r, g, b } });
                          }}
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                          aria-label="Blue"
                        />
                        <div
                          className="w-8 h-8 rounded border border-gray-600"
                          style={{
                            backgroundColor: `rgb(${(field.position.color?.r ?? 0.15) * 255}, ${(field.position.color?.g ?? 0.15) * 255}, ${(field.position.color?.b ?? 0.15) * 255})`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="text-gray-500 text-xs">R G B (0-1)</span>
                      </div>
                    </div>

                    {/* Label edit */}
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Display Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add New Field Form */}
          {showAddField && (
            <div className="mt-4 bg-gray-900/50 rounded-lg border border-teal-700 p-4">
              <h3 className="text-white font-medium text-sm mb-3">Add New Field</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Field Name (unique ID)</label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value.replace(/\s/g, ""))}
                    placeholder="e.g., customNote"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Display Label</label>
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="e.g., Custom Note"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Page</label>
                  <input
                    type="number"
                    value={newFieldPage}
                    onChange={(e) => setNewFieldPage(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">X</label>
                  <input
                    type="number"
                    value={newFieldX}
                    onChange={(e) => setNewFieldX(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Y</label>
                  <input
                    type="number"
                    value={newFieldY}
                    onChange={(e) => setNewFieldY(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Font Size</label>
                  <input
                    type="number"
                    value={newFieldFontSize}
                    onChange={(e) => setNewFieldFontSize(parseInt(e.target.value) || 12)}
                    min={6}
                    max={72}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Max Width</label>
                  <input
                    type="number"
                    value={newFieldMaxWidth}
                    onChange={(e) => setNewFieldMaxWidth(parseFloat(e.target.value) || 0)}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Alignment</label>
                  <select
                    value={newFieldAlignment}
                    onChange={(e) => setNewFieldAlignment(e.target.value as "left" | "center" | "right")}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldBold}
                      onChange={(e) => setNewFieldBold(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-teal-600 focus:ring-teal-500"
                    />
                    Bold
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddField(false)}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddField}
                  disabled={!newFieldName.trim() || !newFieldLabel.trim()}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  Add Field
                </button>
              </div>
            </div>
          )}

          {/* Save / unsaved indicator */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              {fieldMapDirty && (
                <span className="text-yellow-400 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Unsaved changes
                </span>
              )}
            </div>
            <button
              onClick={handleSaveFieldMap}
              disabled={isSavingFieldMap || !fieldMapDirty}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {isSavingFieldMap ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Field Positions"
              )}
            </button>
          </div>
        </section>

        {/* JSON Export/Import */}
        <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <details>
            <summary className="text-lg font-semibold text-white cursor-pointer flex items-center gap-2 select-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Advanced: JSON Field Map
            </summary>
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-3">
                Copy the JSON below to back up your field positions, or paste a JSON field map to import positions.
              </p>
              <textarea
                value={JSON.stringify(fieldMap, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      setFieldMap(parsed);
                      setFieldMapDirty(true);
                    }
                  } catch {
                    // Invalid JSON while typing, ignore
                  }
                }}
                rows={12}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-xs font-mono focus:outline-none focus:border-teal-500 resize-y"
                spellCheck={false}
              />
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
