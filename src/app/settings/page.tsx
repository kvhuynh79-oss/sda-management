"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; role: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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
      alert("Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save settings. Please try again.");
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
          <p className="text-gray-400 mt-1">
            Manage how you receive alerts and updates from the SDA Management System
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
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
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">
            Setup Required
          </h3>
          <p className="text-blue-200 text-sm mb-3">
            To enable email and SMS notifications, your administrator needs to configure external services:
          </p>
          <ul className="text-blue-200 text-sm space-y-2 list-disc list-inside">
            <li>
              <strong>Email:</strong> Configure Resend API (add RESEND_API_KEY to environment variables)
            </li>
            <li>
              <strong>SMS:</strong> Configure Twilio API (add TWILIO credentials to environment variables)
            </li>
          </ul>
          <p className="text-blue-300 text-xs mt-3">
            See <code className="bg-blue-950 px-2 py-1 rounded">convex/notifications.ts</code> for detailed setup instructions
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
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
    </div>
  );
}

function Header({ user }: { user: { firstName: string; lastName: string; role: string } }) {
  const router = useRouter();

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
              <Link href="/participants" className="text-gray-400 hover:text-white transition-colors">
                Participants
              </Link>
              <Link href="/payments" className="text-gray-400 hover:text-white transition-colors">
                Payments
              </Link>
              <Link href="/maintenance" className="text-gray-400 hover:text-white transition-colors">
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
              <Link href="/reports" className="text-gray-400 hover:text-white transition-colors">
                Reports
              </Link>
              <Link href="/settings" className="text-white font-medium">
                Settings
              </Link>
            </nav>
          </div>
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
        </div>
      </div>
    </header>
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
    info: "bg-blue-600",
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
          checked ? "bg-blue-600" : "bg-gray-600"
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
