"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function OrganizationSettingsPage() {
  return (
    <RequireAuth allowedRoles={["admin"]} loadingMessage="Loading organization settings...">
      <OrganizationSettingsContent />
    </RequireAuth>
  );
}

function OrganizationSettingsContent() {
  const { alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch user record to get organizationId
  const userRecord = useQuery(
    api.auth.getUser,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  const orgId = userRecord?.organizationId as Id<"organizations"> | undefined;

  // Fetch organization data
  const organization = useQuery(
    api.organizations.getById,
    user && orgId
      ? { userId: user.id as Id<"users">, organizationId: orgId }
      : "skip"
  );

  // Mutations
  const updateOrg = useMutation(api.organizations.update);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);

  // Initialize form when org loads
  useEffect(() => {
    if (organization) {
      setName(organization.name || "");
      setPrimaryColor(organization.primaryColor || "#0d9488");
      setLogoPreviewUrl((organization as any).resolvedLogoUrl || null);
    }
  }, [organization]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      await alertDialog({
        title: "Invalid File Type",
        message: "Please upload a PNG, JPEG, SVG, or WebP image.",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      await alertDialog({
        title: "File Too Large",
        message: "Logo must be under 2MB.",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Get the URL for the uploaded file
      // For now, store the storageId as the logoUrl
      // The URL will be resolved at display time
      setLogoPreviewUrl(URL.createObjectURL(file));

      // Save the logo URL immediately
      if (orgId && user) {
        await updateOrg({
          userId: user.id as Id<"users">,
          organizationId: orgId,
          logoUrl: storageId,
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      await alertDialog({
        title: "Upload Failed",
        message: "Failed to upload logo. Please try again.",
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (!user || !orgId) return;

    if (!name.trim()) {
      await alertDialog({
        title: "Validation Error",
        message: "Organization name is required.",
      });
      return;
    }

    // Validate hex color
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (!hexRegex.test(primaryColor)) {
      await alertDialog({
        title: "Validation Error",
        message: "Please enter a valid hex color (e.g., #0d9488).",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateOrg({
        userId: user.id as Id<"users">,
        organizationId: orgId,
        name: name.trim(),
        primaryColor,
      });
      await alertDialog({
        title: "Success",
        message: "Organization settings saved successfully.",
      });
    } catch (error) {
      console.error("Error saving organization:", error);
      await alertDialog({
        title: "Error",
        message: "Failed to save organization settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPlan = (plan: string) => {
    const plans: Record<string, string> = {
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return plans[plan] || plan;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, string> = {
      active: "Active",
      trialing: "Trialing",
      past_due: "Past Due",
      canceled: "Canceled",
    };
    return statuses[status] || status;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900/50 text-green-400";
      case "trialing":
        return "bg-blue-900/50 text-blue-400";
      case "past_due":
        return "bg-yellow-900/50 text-yellow-400";
      case "canceled":
        return "bg-red-900/50 text-red-400";
      default:
        return "bg-gray-700 text-gray-400";
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isLoading = userRecord === undefined || (orgId && organization === undefined);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
          <p className="text-gray-400 mt-1">
            Customize your organization&apos;s branding and details
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-4" />
              <div className="h-10 bg-gray-700 rounded w-full mb-6" />
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-4" />
              <div className="h-10 bg-gray-700 rounded w-1/3 mb-6" />
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-4" />
              <div className="h-24 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        )}

        {/* No organization state */}
        {!isLoading && !orgId && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No Organization Found</h3>
            <p className="text-gray-400">
              Your account is not linked to an organization yet. Please contact your administrator.
            </p>
          </div>
        )}

        {/* Organization form */}
        {!isLoading && organization && (
          <div className="space-y-6">
            {/* Organization Name */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">General</h2>

              <div className="space-y-5">
                <div>
                  <label htmlFor="org-name" className="block text-sm font-medium text-gray-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Organization Slug
                  </label>
                  <div className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 text-sm">
                    {organization.slug}
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    URL identifier. Cannot be changed after creation.
                  </p>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Branding</h2>

              <div className="space-y-5">
                {/* Brand Color */}
                <div>
                  <label htmlFor="brand-color" className="block text-sm font-medium text-gray-300 mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="brand-color"
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="#0d9488"
                      maxLength={7}
                    />
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-600 cursor-pointer bg-transparent"
                      aria-label="Choose brand color"
                    />
                    <div
                      className="w-20 h-10 rounded-lg border border-gray-600"
                      style={{ backgroundColor: primaryColor }}
                      aria-label={`Color preview: ${primaryColor}`}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Primary brand color used throughout the app. Enter a hex value.
                  </p>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Organization Logo
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Logo preview */}
                    <div className="w-24 h-24 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Organization logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                        aria-label="Upload organization logo"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        {isUploadingLogo ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Uploading...
                          </span>
                        ) : (
                          "Upload New Logo"
                        )}
                      </button>
                      <p className="text-gray-400 text-xs mt-2">
                        PNG, JPEG, SVG, or WebP. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Information (read-only) */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-400 mb-1">Plan</span>
                  <span className="text-white font-medium text-lg">
                    {formatPlan(organization.plan)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-400 mb-1">Status</span>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColor(
                      organization.subscriptionStatus
                    )}`}
                  >
                    {formatStatus(organization.subscriptionStatus)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-400 mb-1">Max Users</span>
                  <span className="text-white">
                    {organization.maxUsers >= 999999 ? "Unlimited" : organization.maxUsers}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-400 mb-1">Max Properties</span>
                  <span className="text-white">
                    {organization.maxProperties >= 999999 ? "Unlimited" : organization.maxProperties}
                  </span>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <Link
                href="/settings"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
