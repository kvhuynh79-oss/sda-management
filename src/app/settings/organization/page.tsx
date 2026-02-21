"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

  // Provider details state
  const [providerName, setProviderName] = useState("");
  const [abn, setAbn] = useState("");
  const [ndisRegistrationNumber, setNdisRegistrationNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryTitle, setSignatoryTitle] = useState("");
  const [bankBsb, setBankBsb] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [orgAbbreviation, setOrgAbbreviation] = useState("");
  const [defaultGstCode, setDefaultGstCode] = useState("P2");
  const [defaultSupportItemNumber, setDefaultSupportItemNumber] = useState("");
  const [isSavingProvider, setIsSavingProvider] = useState(false);

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

  // Provider settings
  const providerSettings = useQuery(
    api.providerSettings.get,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const upsertProvider = useMutation(api.providerSettings.upsert);

  // Email Forwarding
  const emailForwarders = useQuery(
    api.organizations.getEmailForwarders,
    user && orgId ? { userId: user.id as Id<"users">, organizationId: orgId } : "skip"
  );
  const generateAddress = useMutation(api.organizations.generateInboundEmailAddress);
  const updateEmailSettings = useMutation(api.organizations.updateInboundEmailSettings);
  const addForwarder = useMutation(api.organizations.addEmailForwarder);
  const removeForwarder = useMutation(api.organizations.removeEmailForwarder);
  const setPostmarkHash = useMutation(api.organizations.setPostmarkHashAddress);

  const [newForwarderEmail, setNewForwarderEmail] = useState("");
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [isTogglingEmail, setIsTogglingEmail] = useState(false);
  const [isAddingForwarder, setIsAddingForwarder] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [postmarkHashInput, setPostmarkHashInput] = useState("");
  const [isSavingPostmarkHash, setIsSavingPostmarkHash] = useState(false);
  const [showPostmarkHash, setShowPostmarkHash] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    if (!organization?.inboundEmailAddress) return;
    try {
      await navigator.clipboard.writeText(organization.inboundEmailAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      await alertDialog({ title: "Copy Failed", message: "Could not copy to clipboard. Please select and copy manually." });
    }
  }, [organization?.inboundEmailAddress, alertDialog]);

  const handleGenerateAddress = async () => {
    if (!user || !orgId) return;
    setIsGeneratingAddress(true);
    try {
      await generateAddress({ userId: user.id as Id<"users">, organizationId: orgId });
      await alertDialog({ title: "Address Generated", message: "Your forwarding address has been created. Enable email forwarding to start receiving emails." });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to generate forwarding address." });
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  const handleToggleEmailForwarding = async () => {
    if (!user || !orgId) return;
    setIsTogglingEmail(true);
    try {
      const newState = !organization?.inboundEmailEnabled;
      await updateEmailSettings({ userId: user.id as Id<"users">, organizationId: orgId, enabled: newState });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to update email forwarding settings." });
    } finally {
      setIsTogglingEmail(false);
    }
  };

  const handleAddForwarder = async () => {
    if (!user || !orgId) return;
    const email = newForwarderEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      await alertDialog({ title: "Invalid Email", message: "Please enter a valid email address." });
      return;
    }
    setIsAddingForwarder(true);
    try {
      await addForwarder({ userId: user.id as Id<"users">, organizationId: orgId, email });
      setNewForwarderEmail("");
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to register email. It may already be registered." });
    } finally {
      setIsAddingForwarder(false);
    }
  };

  const handleRemoveForwarder = async (forwarderId: Id<"emailForwarders">) => {
    if (!user || !orgId) return;
    try {
      await removeForwarder({ userId: user.id as Id<"users">, forwarderId });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to remove forwarder." });
    }
  };

  const handleSavePostmarkHash = async () => {
    if (!user || !postmarkHashInput.trim()) return;
    setIsSavingPostmarkHash(true);
    try {
      await setPostmarkHash({ userId: user.id as Id<"users">, postmarkHashAddress: postmarkHashInput.trim() });
      setPostmarkHashInput("");
      await alertDialog({ title: "Saved", message: "Postmark address saved. Emails sent to this address will now be routed to your organization." });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to save Postmark address." });
    } finally {
      setIsSavingPostmarkHash(false);
    }
  };

  // Initialize form when org loads
  useEffect(() => {
    if (organization) {
      setName(organization.name || "");
      setPrimaryColor(organization.primaryColor || "#0d9488");
      setLogoPreviewUrl((organization as any).resolvedLogoUrl || null);
    }
  }, [organization]);

  // Initialize provider details when loaded
  useEffect(() => {
    if (providerSettings) {
      setProviderName(providerSettings.providerName || "");
      setAbn(providerSettings.abn || "");
      setNdisRegistrationNumber(providerSettings.ndisRegistrationNumber || "");
      setContactPhone(providerSettings.contactPhone || "");
      setContactEmail(providerSettings.contactEmail || "");
      setAddress(providerSettings.address || "");
      setSignatoryName(providerSettings.signatoryName || "");
      setSignatoryTitle(providerSettings.signatoryTitle || "");
      setBankBsb(providerSettings.bankBsb || "");
      setBankAccountNumber(providerSettings.bankAccountNumber || "");
      setBankAccountName(providerSettings.bankAccountName || "");
      setOrgAbbreviation((providerSettings as any).orgAbbreviation || "");
      setDefaultGstCode(providerSettings.defaultGstCode || "P2");
      setDefaultSupportItemNumber(providerSettings.defaultSupportItemNumber || "");
    }
  }, [providerSettings]);

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
      await alertDialog({
        title: "Error",
        message: "Failed to save organization settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!user) return;
    setIsSavingProvider(true);
    try {
      // Validate GST code — must be P1, P2, or P5 per NDIS spec
      const validGst = (defaultGstCode === "P1" || defaultGstCode === "P2" || defaultGstCode === "P5") ? defaultGstCode : "P2";
      await upsertProvider({
        userId: user.id as Id<"users">,
        providerName: providerName.trim(),
        ndisRegistrationNumber: ndisRegistrationNumber.trim(),
        abn: abn.trim(),
        defaultGstCode: validGst,
        defaultSupportItemNumber: defaultSupportItemNumber.trim(),
        orgAbbreviation: orgAbbreviation.trim().toUpperCase() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        signatoryName: signatoryName.trim() || undefined,
        signatoryTitle: signatoryTitle.trim() || undefined,
        bankBsb: bankBsb.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
      });
      await alertDialog({ title: "Success", message: "Provider details saved successfully." });
    } catch (error) {
      await alertDialog({ title: "Error", message: "Failed to save provider details." });
    } finally {
      setIsSavingProvider(false);
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

            {/* Provider Details */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Provider Details</h2>
              <p className="text-sm text-gray-400 mb-4">Used on SDA Quotations, Accommodation Agreements, and other generated documents.</p>

              <div className="space-y-5">
                {/* Identity */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="provider-name" className="block text-sm font-medium text-gray-300 mb-1">Provider Name</label>
                      <input id="provider-name" type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Legal entity name" />
                    </div>
                    <div>
                      <label htmlFor="abn" className="block text-sm font-medium text-gray-300 mb-1">ABN</label>
                      <input id="abn" type="text" value={abn} onChange={(e) => setAbn(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="XX XXX XXX XXX" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ndis-reg" className="block text-sm font-medium text-gray-300 mb-1">NDIS Registration Number</label>
                    <input id="ndis-reg" type="text" value={ndisRegistrationNumber} onChange={(e) => setNdisRegistrationNumber(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="XXX XXX XXXX" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="org-abbreviation" className="block text-sm font-medium text-gray-300 mb-1">Organisation Abbreviation</label>
                      <input id="org-abbreviation" type="text" value={orgAbbreviation} onChange={(e) => setOrgAbbreviation(e.target.value.toUpperCase())} maxLength={10} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="BLS" />
                      <p className="text-xs text-gray-500 mt-1">Used in CSV export filenames (e.g. BLS_15022026.csv)</p>
                    </div>
                    <div>
                      <label htmlFor="default-gst-code" className="block text-sm font-medium text-gray-300 mb-1">Default GST Code</label>
                      <select id="default-gst-code" value={defaultGstCode} onChange={(e) => setDefaultGstCode(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                        <option value="P2">P2 - GST Free</option>
                        <option value="P1">P1 - GST Applicable</option>
                        <option value="P5">P5 - Input Taxed</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="default-support-item" className="block text-sm font-medium text-gray-300 mb-1">Default Support Item Number</label>
                      <input id="default-support-item" type="text" value={defaultSupportItemNumber} onChange={(e) => setDefaultSupportItemNumber(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="06_431_0131_2_2" />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                      <input id="contact-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="04XX XXX XXX" />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                      <input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="info@example.com" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                    <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Full business address" />
                  </div>
                </div>

                {/* Signatory */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">Document Signatory</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sig-name" className="block text-sm font-medium text-gray-300 mb-1">Signatory Name</label>
                      <input id="sig-name" type="text" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Name on generated PDFs" />
                    </div>
                    <div>
                      <label htmlFor="sig-title" className="block text-sm font-medium text-gray-300 mb-1">Signatory Title</label>
                      <input id="sig-title" type="text" value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="e.g. Director" />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">Bank Details</h3>
                  <p className="text-xs text-gray-400">Shown on Accommodation Agreements for payment setup.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="bank-bsb" className="block text-sm font-medium text-gray-300 mb-1">BSB</label>
                      <input id="bank-bsb" type="text" value={bankBsb} onChange={(e) => setBankBsb(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="XXX XXX" />
                    </div>
                    <div>
                      <label htmlFor="bank-acct" className="block text-sm font-medium text-gray-300 mb-1">Account Number</label>
                      <input id="bank-acct" type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="XX XXXX" />
                    </div>
                    <div>
                      <label htmlFor="bank-name" className="block text-sm font-medium text-gray-300 mb-1">Account Name</label>
                      <input id="bank-name" type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Business name on account" />
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="pt-2">
                  <button onClick={handleSaveProvider} disabled={isSavingProvider} className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                    {isSavingProvider ? "Saving..." : "Save Provider Details"}
                  </button>
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

            {/* Email Forwarding */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-1">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Email Forwarding</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5">
                Forward emails from Outlook to automatically create communication records in MySDAManager.
              </p>

              {/* Forwarding Address */}
              <div className="space-y-4">
                {!organization.inboundEmailAddress ? (
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                    <p className="text-sm text-gray-300 mb-3">
                      Generate a unique forwarding address for your organization. Emails sent to this address will be automatically logged as communications.
                    </p>
                    <button
                      onClick={handleGenerateAddress}
                      disabled={isGeneratingAddress}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      {isGeneratingAddress ? "Generating..." : "Generate Forwarding Address"}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Address display + copy + toggle */}
                    <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-300">Forwarding Address</label>
                        <button
                          onClick={handleToggleEmailForwarding}
                          disabled={isTogglingEmail}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                            organization.inboundEmailEnabled ? "bg-teal-600" : "bg-gray-600"
                          }`}
                          role="switch"
                          aria-checked={!!organization.inboundEmailEnabled}
                          aria-label="Toggle email forwarding"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              organization.inboundEmailEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-teal-400 text-sm font-mono select-all">
                          {organization.inboundEmailAddress}
                        </code>
                        <button
                          onClick={handleCopyAddress}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          aria-label="Copy forwarding address"
                        >
                          {copiedAddress ? (
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {organization.inboundEmailEnabled
                          ? "Active - forwarded emails will create communication records."
                          : "Disabled - forwarded emails will be ignored."}
                      </p>
                    </div>

                    {/* Registered Forwarders */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Registered Email Addresses</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        Register the email addresses that will forward emails. This identifies who sent the forward so communications are attributed correctly.
                      </p>

                      {/* Add forwarder */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="email"
                          value={newForwarderEmail}
                          onChange={(e) => setNewForwarderEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddForwarder()}
                          placeholder="email@example.com"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          autoComplete="email"
                        />
                        <button
                          onClick={handleAddForwarder}
                          disabled={isAddingForwarder || !newForwarderEmail.trim()}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                          {isAddingForwarder ? "Adding..." : "Add"}
                        </button>
                      </div>

                      {/* Forwarder list */}
                      {emailForwarders && emailForwarders.length > 0 ? (
                        <div className="space-y-2">
                          {emailForwarders.map((f) => (
                            <div
                              key={f._id}
                              className="flex items-center justify-between px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-sm text-white truncate">{f.email}</span>
                                {f.userName && (
                                  <span className="text-xs text-gray-400">({f.userName})</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveForwarder(f._id as Id<"emailForwarders">)}
                                className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                                aria-label={`Remove ${f.email}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No email addresses registered yet.</p>
                      )}
                    </div>

                    {/* How-to Instructions */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mt-4">
                      <h3 className="text-sm font-medium text-teal-400 mb-2">How to Forward Emails</h3>
                      <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                        <li>Open the email in Outlook (desktop or web)</li>
                        <li>Click <strong className="text-white">Forward</strong></li>
                        <li>Paste the forwarding address above into the <strong className="text-white">To</strong> field</li>
                        <li>Click <strong className="text-white">Send</strong></li>
                        <li>The email appears in Communications within seconds</li>
                      </ol>
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <p className="text-xs text-teal-400 font-medium mb-1">Pro Tip: Create an Outlook Quick Step</p>
                        <p className="text-xs text-gray-400">
                          In Outlook, go to <strong className="text-gray-300">Home &rarr; Quick Steps &rarr; New Quick Step &rarr; Forward to</strong> and paste your forwarding address. Then you can push any email to MySDAManager with a single click.
                        </p>
                      </div>
                    </div>

                    {/* Postmark Alternative Address */}
                    <div className="mt-4">
                      <button
                        onClick={() => setShowPostmarkHash(!showPostmarkHash)}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                      >
                        <svg className={`w-3 h-3 transform transition-transform ${showPostmarkHash ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Advanced: Postmark Direct Address
                      </button>
                      {showPostmarkHash && (
                        <div className="mt-2 bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                          <p className="text-xs text-gray-400 mb-2">
                            If your custom domain MX records haven&apos;t propagated yet, paste Postmark&apos;s default inbound address here as a fallback.
                          </p>
                          {(organization as any).postmarkHashAddress ? (
                            <div className="mb-2">
                              <code className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 font-mono break-all">
                                {(organization as any).postmarkHashAddress}
                              </code>
                              <span className="text-xs text-green-400 ml-2">Active</span>
                            </div>
                          ) : null}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={postmarkHashInput}
                              onChange={(e) => setPostmarkHashInput(e.target.value)}
                              placeholder="abc123@inbound.postmarkapp.com"
                              className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                            <button
                              onClick={handleSavePostmarkHash}
                              disabled={isSavingPostmarkHash || !postmarkHashInput.trim()}
                              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                              {isSavingPostmarkHash ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
