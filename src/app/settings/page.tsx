"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";

type UserRole = "admin" | "property_manager" | "staff" | "accountant" | "sil_provider";

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone: string;
}

const emptyUserForm: UserFormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "staff",
  phone: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // User management state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // User management queries/mutations
  const allUsers = useQuery(
    api.auth.getAllUsers,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );
  const createUser = useAction(api.auth.createUser);
  const updateUser = useMutation(api.auth.updateUser);
  const resetPassword = useAction(api.auth.resetPassword);

  // Get notification preferences
  const preferences = useQuery(
    api.notifications.getUserPreferences,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // Mutation to update preferences
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  // Action to send test notification
  const sendTestNotification = useAction(api.notifications.sendTestNotification);

  // Local state for form
  const [formData, setFormData] = useState({
    emailEnabled: false,
    smsEnabled: false,
    criticalAlerts: true,
    warningAlerts: true,
    infoAlerts: false,
    dailyDigest: false,
    weeklyDigest: false,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handleToggle = (field: keyof typeof formData) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updatePreferences({
        userId: user.id as Id<"users">,
        ...formData,
      });
      await alertDialog({ title: "Success", message: "Notification settings saved successfully!" });
    } catch (error) {
      console.error("Error saving preferences:", error);
      await alertDialog({ title: "Error", message: "Failed to save settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async (testType: "email" | "sms" | "both") => {
    if (!user) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestNotification({
        userId: user.id as Id<"users">,
        testType,
      });

      if (result.success && result.results) {
        const messages = [];
        if (result.results.email) messages.push(`Email: ${result.results.email}`);
        if (result.results.sms) messages.push(`SMS: ${result.results.sms}`);
        setTestResult(messages.join("\n"));
      } else {
        setTestResult(`Error: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error testing notification:", error);
      setTestResult(`Failed to send test notification: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  // User management handlers
  const handleOpenCreateUser = () => {
    setUserFormData(emptyUserForm);
    setEditingUserId(null);
    setUserError(null);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (userToEdit: { id: string; firstName: string; lastName: string; role: string; email: string }) => {
    setUserFormData({
      email: userToEdit.email,
      password: "", // Don't show password
      firstName: userToEdit.firstName,
      lastName: userToEdit.lastName,
      role: userToEdit.role as UserRole,
      phone: "",
    });
    setEditingUserId(userToEdit.id);
    setUserError(null);
    setShowUserModal(true);
  };

  const handleSubmitUser = async () => {
    if (!user) return;

    setIsSubmittingUser(true);
    setUserError(null);

    try {
      if (editingUserId) {
        // Update existing user - pass acting user ID for admin verification
        await updateUser({
          actingUserId: user.id as Id<"users">,
          targetUserId: editingUserId as Id<"users">,
          firstName: userFormData.firstName,
          lastName: userFormData.lastName,
          role: userFormData.role,
        });
      } else {
        // Create new user - pass acting user ID for admin verification
        if (!userFormData.password) {
          setUserError("Password is required for new users");
          setIsSubmittingUser(false);
          return;
        }
        await createUser({
          actingUserId: user.id as Id<"users">,
          email: userFormData.email,
          password: userFormData.password,
          firstName: userFormData.firstName,
          lastName: userFormData.lastName,
          role: userFormData.role,
          phone: userFormData.phone || undefined,
        });
      }
      setShowUserModal(false);
      setUserFormData(emptyUserForm);
      setEditingUserId(null);
    } catch (error) {
      console.error("Error saving user:", error);
      setUserError(error instanceof Error ? error.message : "Failed to save user");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentlyActive: boolean) => {
    if (!user) return;

    try {
      await updateUser({
        actingUserId: user.id as Id<"users">,
        targetUserId: userId as Id<"users">,
        isActive: !currentlyActive,
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      await alertDialog({ title: "Error", message: "Failed to update user status" });
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!user) return;

    if (!newPassword) {
      await alertDialog({ title: "Notice", message: "Please enter a new password" });
      return;
    }
    try {
      await resetPassword({
        actingUserId: user.id as Id<"users">,
        targetUserId: userId as Id<"users">,
        newPassword,
      });
      setShowResetPassword(null);
      setNewPassword("");
      await alertDialog({ title: "Success", message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      await alertDialog({ title: "Error", message: "Failed to reset password" });
    }
  };

  const formatRole = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Admin",
      property_manager: "Property Manager",
      staff: "Staff",
      accountant: "Accountant",
      sil_provider: "SIL Provider",
    };
    return roles[role] || role;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <RequireAuth>
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account preferences
          </p>
        </div>

        {/* Integrations */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
          <div className="space-y-4">
            <Link
              href="/settings/integrations/xero"
              className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex-1">
                <h4 className="text-white font-medium">Xero Integration</h4>
                <p className="text-gray-400 text-sm mt-1">
                  Connect to Xero for automatic bank feed syncing
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-sm">Configure</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <Link
              href="/settings/integrations/calendar"
              className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h4 className="text-white font-medium">Calendar Integrations</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    Connect Google Calendar or Outlook for two-way event sync
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-sm">Configure</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Organization & API - Admin Only */}
        {user.role === "admin" && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Administration</h3>
            <div className="space-y-4">
              <Link
                href="/settings/organization"
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="text-white font-medium">Organization Settings</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    Manage your organization&apos;s name, branding, and logo
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm">Configure</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <Link
                href="/settings/api-keys"
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="text-white font-medium">API Keys</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    Create and manage REST API keys for external integrations
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm">Manage</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* User Management - Admin Only */}
        {user.role === "admin" && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <p className="text-gray-400 text-sm mt-1">Manage user accounts and permissions</p>
              </div>
              <button
                onClick={handleOpenCreateUser}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-sm font-medium"
              >
                + Add User
              </button>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {allUsers?.map((u) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    u.isActive ? "bg-gray-700/50" : "bg-gray-700/30 opacity-60"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-700 rounded-full flex items-center justify-center text-white font-medium">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {u.firstName} {u.lastName}
                          {u.id === user.id && (
                            <span className="ml-2 text-xs text-teal-500">(You)</span>
                          )}
                        </h4>
                        <p className="text-gray-400 text-sm">{u.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      u.role === "admin" ? "bg-purple-600 text-white" :
                      u.role === "property_manager" ? "bg-teal-700 text-white" :
                      u.role === "accountant" ? "bg-green-600 text-white" :
                      u.role === "sil_provider" ? "bg-orange-600 text-white" :
                      "bg-gray-600 text-white"
                    }`}>
                      {formatRole(u.role)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      u.isActive ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                    }`}>
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                        title="Edit user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowResetPassword(u.id)}
                        className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-600 rounded transition-colors"
                        title="Reset password"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleToggleUserActive(u.id, u.isActive)}
                          className={`p-2 rounded transition-colors ${
                            u.isActive
                              ? "text-gray-400 hover:text-red-400 hover:bg-gray-600"
                              : "text-gray-400 hover:text-green-400 hover:bg-gray-600"
                          }`}
                          title={u.isActive ? "Disable user" : "Enable user"}
                        >
                          {u.isActive ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!allUsers?.length && (
                <p className="text-gray-400 text-center py-8">No users found</p>
              )}
            </div>

            {/* Reset Password Inline */}
            {showResetPassword && (
              <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <h4 className="text-yellow-300 font-medium mb-2">Reset Password</h4>
                <p className="text-yellow-200 text-sm mb-3">
                  Enter a new password for {allUsers?.find(u => u.id === showResetPassword)?.firstName}
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <button
                    onClick={() => handleResetPassword(showResetPassword)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { setShowResetPassword(null); setNewPassword(""); }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs - Admin Only */}
        {user.role === "admin" && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Audit Logs</h3>
                <p className="text-gray-400 text-sm mt-1">View all user actions and system changes for security and compliance</p>
              </div>
              <Link
                href="/admin/audit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                View Audit Logs
              </Link>
            </div>
          </div>
        )}

        {/* Appearance */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex-1">
                <h4 className="text-white font-medium">Theme</h4>
                <p className="text-gray-400 text-sm mt-1">Choose your preferred color scheme</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-teal-700 text-white"
                      : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === "light"
                      ? "bg-teal-700 text-white"
                      : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage how you receive alerts and updates
          </p>
        </div>

        {/* Notification Channels */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
          <div className="space-y-4">
            <ToggleRow
              label="Email Notifications"
              description="Receive alerts via email"
              checked={formData.emailEnabled}
              onChange={() => handleToggle("emailEnabled")}
            />
            <ToggleRow
              label="SMS Notifications"
              description="Receive critical and warning alerts via text message"
              checked={formData.smsEnabled}
              onChange={() => handleToggle("smsEnabled")}
            />
          </div>
        </div>

        {/* Alert Types */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Alert Types</h3>
          <p className="text-gray-400 text-sm mb-4">
            Choose which severity levels you want to receive notifications for
          </p>
          <div className="space-y-4">
            <ToggleRow
              label="Critical Alerts"
              description="Urgent issues requiring immediate attention (overdue maintenance, expiring plans)"
              checked={formData.criticalAlerts}
              onChange={() => handleToggle("criticalAlerts")}
              badge="critical"
            />
            <ToggleRow
              label="Warning Alerts"
              description="Important items that need attention soon (upcoming due dates)"
              checked={formData.warningAlerts}
              onChange={() => handleToggle("warningAlerts")}
              badge="warning"
            />
            <ToggleRow
              label="Info Alerts"
              description="General informational updates (vacancies, system notifications)"
              checked={formData.infoAlerts}
              onChange={() => handleToggle("infoAlerts")}
              badge="info"
            />
          </div>
        </div>

        {/* Digest Options */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Digest Emails</h3>
          <p className="text-gray-400 text-sm mb-4">
            Receive a summary of all active alerts at regular intervals
          </p>
          <div className="space-y-4">
            <ToggleRow
              label="Daily Digest"
              description="Receive a daily summary of all active alerts at 9 AM"
              checked={formData.dailyDigest}
              onChange={() => handleToggle("dailyDigest")}
            />
            <ToggleRow
              label="Weekly Digest"
              description="Receive a weekly summary every Monday morning"
              checked={formData.weeklyDigest}
              onChange={() => handleToggle("weeklyDigest")}
              disabled={true}
              comingSoon={true}
            />
          </div>
        </div>

        {/* Test Notifications */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Test Notifications</h3>
          <p className="text-gray-400 text-sm mb-4">
            Send a test notification to verify your setup is working correctly
          </p>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleTestNotification("email")}
              disabled={isTesting || !formData.emailEnabled}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              {isTesting ? "Sending..." : "Send Test Email"}
            </button>
            <button
              onClick={() => handleTestNotification("sms")}
              disabled={isTesting || !formData.smsEnabled}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              {isTesting ? "Sending..." : "Send Test SMS"}
            </button>
            <button
              onClick={() => handleTestNotification("both")}
              disabled={isTesting || (!formData.emailEnabled && !formData.smsEnabled)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
            >
              {isTesting ? "Sending..." : "Send Both"}
            </button>
          </div>
          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.includes("success") ? "bg-green-900/30 border border-green-800" : "bg-red-900/30 border border-red-800"}`}>
              <pre className="text-sm text-white whitespace-pre-wrap font-mono">{testResult}</pre>
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-teal-950/20 border border-teal-900 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-teal-400 mb-2">
            Setup Required
          </h3>
          <p className="text-teal-200 text-sm mb-3">
            To enable email and SMS notifications, your administrator needs to configure external services:
          </p>
          <ul className="text-teal-200 text-sm space-y-2 list-disc list-inside">
            <li>
              <strong>Email:</strong> Configure Resend API (add RESEND_API_KEY to environment variables)
            </li>
            <li>
              <strong>SMS:</strong> Configure Twilio API (add TWILIO credentials to environment variables)
            </li>
          </ul>
          <p className="text-teal-400 text-xs mt-3">
            See <code className="bg-teal-950 px-2 py-1 rounded">convex/notifications.ts</code> for detailed setup instructions
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Cancel
          </Link>
        </div>
      </main>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                {editingUserId ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                  {userError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                  disabled={!!editingUserId}
                  required
                />
                {editingUserId && (
                  <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
                )}
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="staff">Staff</option>
                  <option value="property_manager">Property Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="sil_provider">SIL Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {!editingUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUser}
                disabled={isSubmittingUser || !userFormData.firstName || !userFormData.lastName || (!editingUserId && (!userFormData.email || !userFormData.password))}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSubmittingUser ? "Saving..." : editingUserId ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RequireAuth>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  badge,
  disabled = false,
  comingSoon = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  badge?: "critical" | "warning" | "info";
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const badgeColors = {
    critical: "bg-red-600",
    warning: "bg-yellow-600",
    info: "bg-teal-700",
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium">{label}</h4>
          {badge && (
            <span
              className={`px-2 py-0.5 text-white text-xs rounded uppercase font-bold ${badgeColors[badge]}`}
            >
              {badge}
            </span>
          )}
          {comingSoon && (
            <span className="px-2 py-0.5 text-gray-400 text-xs rounded bg-gray-700 uppercase font-bold">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? "bg-teal-700" : "bg-gray-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
