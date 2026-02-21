"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import Link from "next/link";
import MfaSetup from "@/components/MfaSetup";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function SecuritySettingsPage() {
  return (
    <RequireAuth loadingMessage="Loading security settings...">
      <SecuritySettingsContent />
    </RequireAuth>
  );
}

function SecuritySettingsContent() {
  const router = useRouter();
  const { confirm: confirmDialog, alert: alertDialog } = useConfirmDialog();
  const [user, setUser] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState("");
  const [copiedCodes, setCopiedCodes] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  // Get MFA status
  const mfaStatus = useQuery(
    api.mfa.getMfaStatus,
    user ? { userId: user.id as Id<"users"> } : "skip"
  );

  // MFA Actions and Mutations
  const setupMfaAction = useAction(api.mfa.setupMfa);
  const verifyAndEnableMfa = useMutation(api.mfa.verifyAndEnableMfa);
  const disableMfaMutation = useMutation(api.mfa.disableMfa);
  const regenerateBackupCodesAction = useAction(api.mfa.regenerateBackupCodes);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const handleEnableMfa = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError("");

    try {
      const result = await setupMfaAction({ userId: user.id as Id<"users"> });
      setMfaSecret(result.secret);
      setQrCodeUrl(result.qrCodeDataUrl);
      setBackupCodes(result.backupCodes); // Store backup codes from setup
      setShowMfaSetup(true);
    } catch (err) {
      setError("Failed to generate MFA setup. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyMfa = async (code: string) => {
    if (!user) return;

    setIsVerifying(true);
    setError("");

    try {
      const result = await verifyAndEnableMfa({
        userId: user.id as Id<"users">,
        totpCode: code,
      });

      if (result.success) {
        // Backup codes were stored during setupMfa, show them now
        setShowBackupCodes(true);
        setShowMfaSetup(false);
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!user) return;

    // Require TOTP verification before disabling MFA
    const totpCode = prompt(
      "Enter your current authenticator code to disable 2FA:"
    );
    if (!totpCode) return;

    const confirmed = await confirmDialog({
      title: "Disable 2FA",
      message: "Are you sure you want to disable two-factor authentication? This will make your account less secure.",
      variant: "danger",
      confirmLabel: "Disable",
    });
    if (!confirmed) return;

    setIsDisabling(true);
    setError("");

    try {
      await disableMfaMutation({
        userId: user.id as Id<"users">,
        actingUserId: user.id as Id<"users">,
        totpCode: totpCode,
      });
      await alertDialog({ title: "Success", message: "Two-factor authentication has been disabled." });
    } catch (err) {
      setError("Failed to disable MFA. Please try again.");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!user) return;

    // Prompt for TOTP code for verification
    const totpCode = prompt(
      "Enter your current authenticator code to regenerate backup codes:"
    );
    if (!totpCode) return;

    const confirmed = await confirmDialog({
      title: "Regenerate Backup Codes",
      message: "Are you sure you want to regenerate backup codes? Your old backup codes will no longer work.",
      variant: "danger",
      confirmLabel: "Regenerate",
    });
    if (!confirmed) return;

    setIsGenerating(true);
    setError("");

    try {
      const result = await regenerateBackupCodesAction({
        userId: user.id as Id<"users">,
        totpCode: totpCode,
      });
      if (result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setShowBackupCodes(true);
      }
    } catch (err) {
      setError("Failed to regenerate backup codes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedCodes(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
    }
  };

  const handlePrintBackupCodes = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>MFA Backup Codes - ${user?.email}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
            }
            h1 { color: #1f2937; margin-bottom: 10px; }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 16px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .codes {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              line-height: 2;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Two-Factor Authentication Backup Codes</h1>
          <p><strong>Account:</strong> ${user?.email}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

          <div class="warning">
            <strong>⚠️ Important:</strong> Keep these codes in a safe place. Each code can only be used once. If you lose access to your authenticator app, you can use these codes to sign in.
          </div>

          <div class="codes">
            ${backupCodes.map(code => `<div>${code}</div>`).join("")}
          </div>

          <div class="footer">
            <p>These codes were generated from MySDAManager. Store them securely and never share them with anyone.</p>
          </div>

          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #0f766e; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
            <button onclick="window.close()" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  if (!user || mfaStatus === undefined) {
    return <LoadingScreen message="Loading security settings..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="settings" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/settings"
            className="text-teal-500 hover:text-teal-400 text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Security Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account security and two-factor authentication
          </p>
        </div>

        {/* SECURITY (S2): MFA Setup Required Banner for Admins */}
        {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mfaSetupRequired") === "true" && !mfaStatus?.mfaEnabled && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-yellow-300">Multi-Factor Authentication Required</p>
                <p className="text-sm mt-1">
                  NDIS APP-5 compliance requires admin accounts to have MFA enabled.
                  Please set up two-factor authentication below to continue accessing admin features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* MFA Status Card */}
        {!showMfaSetup && !showBackupCodes && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Two-Factor Authentication (2FA)</h3>
                <p className="text-gray-400 text-sm">
                  Add an extra layer of security to your account by requiring a verification code from your authenticator app when signing in.
                </p>
              </div>
              <div>
                {mfaStatus?.mfaEnabled ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/50 text-green-400 rounded-lg text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {mfaStatus?.mfaEnabled ? (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerateBackupCodes}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    {isGenerating ? "Generating..." : "Regenerate Backup Codes"}
                  </button>
                  <button
                    onClick={handleDisableMfa}
                    disabled={isDisabling}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    {isDisabling ? "Disabling..." : "Disable 2FA"}
                  </button>
                </div>
                <p className="text-gray-400 text-sm">
                  If you&apos;ve lost your backup codes, you can regenerate them. Your old codes will no longer work.
                </p>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleEnableMfa}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  {isGenerating ? "Generating..." : "Enable Two-Factor Authentication"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* MFA Setup Component */}
        {showMfaSetup && !showBackupCodes && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <MfaSetup
              secret={mfaSecret}
              qrCodeUrl={qrCodeUrl}
              onVerified={handleVerifyMfa}
              onCancel={() => {
                setShowMfaSetup(false);
                setMfaSecret("");
                setQrCodeUrl("");
                setError("");
              }}
              isVerifying={isVerifying}
            />
          </div>
        )}

        {/* Backup Codes Display */}
        {showBackupCodes && backupCodes.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">2FA Enabled Successfully!</h3>
              <p className="text-gray-400 text-sm">
                Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm">
                  <p className="text-yellow-300 font-medium mb-1">Important: Save These Codes</p>
                  <ul className="text-yellow-200/80 space-y-1 list-disc list-inside">
                    <li>Each code can only be used once</li>
                    <li>Store them in a password manager or print them</li>
                    <li>You won&apos;t be able to see them again after leaving this page</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Backup Codes */}
            <div className="bg-gray-900 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <code key={index} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm text-center">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyBackupCodes}
                className="flex-1 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {copiedCodes ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All Codes
                  </>
                )}
              </button>
              <button
                onClick={handlePrintBackupCodes}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Codes
              </button>
              <button
                onClick={() => {
                  setShowBackupCodes(false);
                  setBackupCodes([]);
                }}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Push Notifications */}
        {!showMfaSetup && !showBackupCodes && (
          <div className="mb-6">
            <PushNotificationPrompt userId={user ? user.id as Id<"users"> : null} />
          </div>
        )}

        {/* Security Best Practices */}
        {!showMfaSetup && !showBackupCodes && (
          <div className="bg-teal-950/20 border border-teal-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-teal-400 mb-3">
              Security Best Practices
            </h3>
            <ul className="text-teal-200 text-sm space-y-2">
              <li className="flex gap-3">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <strong>Enable 2FA:</strong> Two-factor authentication significantly improves your account security by requiring both your password and a code from your authenticator app.
                </div>
              </li>
              <li className="flex gap-3">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <div>
                  <strong>Use Strong Passwords:</strong> Create unique, complex passwords for all your accounts. Consider using a password manager.
                </div>
              </li>
              <li className="flex gap-3">
                <svg className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <strong>Keep Backup Codes Safe:</strong> Store your backup codes in a secure location separate from your authenticator app, like a password manager or printed in a safe place.
                </div>
              </li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
